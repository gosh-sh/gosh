"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const axios = require('axios');
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection of promise for reason:', reason);
    // process.exit(1);
});
const cnf = JSON.parse(fs_1.default.readFileSync('config/config.json', 'utf-8'));
let app = (0, express_1.default)();
async function do_process() {
    const lines = [];
    const res = await axios.get(cnf.target, { headers: cnf.headers });
    const data = res.data[0];
    for (let k of Object.keys(data)) {
        const kk = cnf.prefix + k;
        lines.push(`# HELP ${kk} ${kk}`, `# TYPE ${kk} gauge`, `${kk} ${data[k]}`);
    }
    return lines.join("\n");
}
// do_process().then((lines: string) => {console.log(lines);});
app.use(function (req, res, next) {
    console.log(req.socket.remoteAddress + ' ' + req.method + ' ' + req.path);
    next();
});
app.get('/', (req, res) => {
    res.send(`<h1>Supabase exporter</h1><a href="/metrics">Prometheus metrics</a>\n`);
});
app.get('/metrics', async (req, res) => {
    res.send(await do_process());
});
app.listen(cnf.port, () => {
    console.log(`Supabase exporter started on port ${cnf.port}`);
});
