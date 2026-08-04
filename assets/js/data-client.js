window.PYOEDUDataClient = (() => {
  "use strict";

  const DATABASE_NAME = "pyoedu-public-cache";
  const STORE_NAME = "responses";
  const CACHE_VERSION = "schema-2026-08-03-v1";
  const FRESH_TTL = 15 * 60 * 1000;
  const STALE_TTL = 6 * 60 * 60 * 1000;
  const pendingRequests = new Map();

  function getApiUrl() {
    const url = String(window.PYOEDU_CONFIG?.apiUrl || "").trim();
    if (!url) throw new Error("ยังไม่ได้กำหนด Google Apps Script API URL");
    return url;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
      const request = indexedDB.open(DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function readCache(key) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get(key);
      request.onsuccess = () => {
        const record = request.result;
        if (!record || Date.now() - record.savedAt > STALE_TTL) return resolve(null);
        resolve({ value: record.value, fresh: Date.now() - record.savedAt <= FRESH_TTL });
      };
      request.onerror = () => reject(request.error);
    }).finally(() => database.close());
  }

  async function writeCache(key, value) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({ key, value, savedAt: Date.now() });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    }).finally(() => database.close());
  }

  function buildUrl(parameters) {
    const base = new URL(getApiUrl(), window.location.href);
    Object.entries(parameters).forEach(([name, value]) => {
      if (value === "" || value === null || value === undefined) return;
      const serialized = Array.isArray(value) ? value.join("|") : String(value);
      if (serialized) base.searchParams.set(name, serialized);
    });
    return base.toString();
  }

  function normalizeFilters(filters = {}) {
    return Object.fromEntries(Object.entries(filters)
      .filter(([, value]) => value !== "" && value !== null && value !== undefined && (!Array.isArray(value) || value.length))
      .map(([field, value]) => [`filter_${field}`, value]));
  }

  function cacheKey(parameters) {
    const normalized = Object.fromEntries(Object.entries(parameters).sort(([left], [right]) => left.localeCompare(right)));
    return `${CACHE_VERSION}|${JSON.stringify(normalized)}`;
  }

  async function requestNetwork(parameters) {
    let response;
    try {
      response = await fetch(buildUrl(parameters), { headers: { Accept: "application/json" } });
    } catch (error) {
      throw new Error("เชื่อมต่อ Apps Script ไม่สำเร็จ กรุณาตรวจสอบว่า Web App เปิดสิทธิ์เป็น Anyone และลองใหม่");
    }
    if (!response.ok) throw new Error(`API ตอบกลับ HTTP ${response.status}`);
    if (response.redirected && /accounts\.google\.com/i.test(response.url)) {
      throw new Error("Apps Script Web App ยังไม่เปิดสิทธิ์สาธารณะ กรุณา Deploy โดยกำหนดผู้มีสิทธิ์เข้าถึงเป็น Anyone");
    }
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("application/json")) {
      throw new Error("Apps Script ไม่ได้ส่งข้อมูล JSON กรุณาตรวจสอบ Deployment และสิทธิ์ Public access");
    }
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (error) {
      throw new Error("รูปแบบข้อมูลจาก Apps Script ไม่ถูกต้อง");
    }
    if (!result.success) throw new Error(result.message || "API ไม่สามารถส่งข้อมูลได้");
    return result;
  }

  function refreshInBackground(key, parameters) {
    requestNetwork(parameters)
      .then(value => writeCache(key, value))
      .catch(error => console.warn("Background refresh skipped", error));
  }

  async function request(parameters, { bypassCache = false } = {}) {
    const key = cacheKey(parameters);
    if (!bypassCache) {
      try {
        const cached = await readCache(key);
        if (cached) {
          if (!cached.fresh) refreshInBackground(key, parameters);
          return cached.value;
        }
      } catch (error) {
        console.warn("Browser cache unavailable", error);
      }
    }
    if (pendingRequests.has(key)) return pendingRequests.get(key);
    const pending = requestNetwork(parameters)
      .then(result => {
        writeCache(key, result).catch(error => console.warn("Cache write skipped", error));
        return result;
      })
      .finally(() => pendingRequests.delete(key));
    pendingRequests.set(key, pending);
    return pending;
  }

  function rows(dbKey, sheetName, options = {}) {
    return request({
      action: "rows",
      dbKey,
      sheetName,
      page: options.page || 1,
      pageSize: options.pageSize || 100,
      search: options.search || "",
      searchFields: options.searchFields || [],
      ...normalizeFilters(options.filters)
    }, options);
  }

  function metadata(dbKey, sheetName, fields, filters = {}) {
    return request({ action: "metadata", dbKey, sheetName, fields, ...normalizeFilters(filters) });
  }

  function summary(dbKey, sheetName, options = {}) {
    return request({
      action: "summary",
      dbKey,
      sheetName,
      groupBy: options.groupBy || [],
      metrics: options.metrics || [],
      ...normalizeFilters(options.filters)
    });
  }

  async function allRows(dbKey, sheetName, options = {}) {
    const output = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const result = await rows(dbKey, sheetName, { ...options, page, pageSize: 500 });
      output.push(...result.data);
      hasMore = result.pagination.hasMore;
      options.onProgress?.(output.length, result.pagination.totalRows);
      page += 1;
    }
    return output;
  }

  async function clearCache() {
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).clear();
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    } catch (error) {
      console.warn("Cache clear skipped", error);
    }
  }

  return Object.freeze({ rows, allRows, metadata, summary, clearCache });
})();
