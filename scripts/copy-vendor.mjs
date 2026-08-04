import fs from "node:fs/promises";
import path from "node:path";

const copies = [
  ["node_modules/chart.js/dist/chart.umd.js", "assets/vendor/chart/chart.umd.js"],
  ["node_modules/chartjs-plugin-datalabels/dist/chartjs-plugin-datalabels.min.js", "assets/vendor/chart/chartjs-plugin-datalabels.min.js"],
  ["node_modules/leaflet/dist/leaflet.css", "assets/vendor/leaflet/leaflet.css"],
  ["node_modules/leaflet/dist/leaflet.js", "assets/vendor/leaflet/leaflet.js"],
  ["node_modules/leaflet/dist/images/marker-icon.png", "assets/vendor/leaflet/images/marker-icon.png"],
  ["node_modules/leaflet/dist/images/marker-icon-2x.png", "assets/vendor/leaflet/images/marker-icon-2x.png"],
  ["node_modules/leaflet/dist/images/marker-shadow.png", "assets/vendor/leaflet/images/marker-shadow.png"],
  ["node_modules/exceljs/dist/exceljs.min.js", "assets/vendor/exceljs/exceljs.min.js"]
];

for (const [source, destination] of copies) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

console.log(`Copied ${copies.length} vendor assets.`);
