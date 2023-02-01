import express, {Request, Response} from "express";
import fs from "fs";
const axios = require('axios');

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection of promise for reason:', reason);
    // process.exit(1);
});

const cnf = JSON.parse(fs.readFileSync('config/config.json', 'utf-8'));

let app = express();

async function do_process(): Promise<string> {
    const lines: string[] = [];
    const res = await axios.get(cnf.target, {headers: cnf.headers});
    const data = res.data[0];
    for (let k of Object.keys(data)) {
        const kk = cnf.prefix + k;
        lines.push(`# HELP ${kk} ${kk}`, `# TYPE ${kk} gauge`, `${kk} ${data[k]}`);
    }
    return lines.join("\n");
}

// do_process().then((lines: string) => {console.log(lines);});

app.use(function (req: Request, res: Response, next) {
    console.log(req.socket.remoteAddress + ' ' + req.method + ' ' + req.path);
    next();
});

app.get('/', (req: Request, res: Response) => {
    res.send(`<h1>Supabase exporter</h1><a href="/metrics">Prometheus metrics</a>\n`);
});

app.get('/metrics', async (req: Request, res: Response) => {
    res.send(await do_process());
});

app.listen(cnf.port, () => {
    console.log(`Supabase exporter started on port ${cnf.port}`);
});
