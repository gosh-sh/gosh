import GoshHandler from "./Handlers/GoshHandler";
import AppReadHandler from "./Handlers/AppReadHandler";
import AppWriteHandler from "./Handlers/AppWriteHandler";
import ExtReadHandler from "./Handlers/ExtReadHandler";
import RemoteReadHandler from "./Handlers/RemoteReadHandler";
import RemoteWriteHandler from "./Handlers/RemoteWriteHandler";
import AppRotateHandler from "./Handlers/AppRotateHandler";
import SeedReadHandler from "./Handlers/SeedReadHandler";
import AppSetupHandler from "./Handlers/AppSetupHandler";
import ScriptHandler from "./Handlers/ScriptHandler";
import RMonitorHandler from "./Handlers/RMonitorHandler";

export type HandlerType = string;

export default function selectHandler(type: HandlerType, silent?: boolean): GoshHandler {
    if (silent !== true)
        console.log('selectHandler, type:', type);
    switch (type) {
        case    'app-read':  return new AppReadHandler();
        case  'extui-read':  return new ExtReadHandler();
        case 'remote-read':  return new RemoteReadHandler();
        case    'app-write': return new AppWriteHandler();
        case  'extui-write': throw new TypeError('Not implemented');
        case 'remote-write': return new RemoteWriteHandler();
        case   'app-rotate': return new AppRotateHandler();
        case    'seed-read': return new SeedReadHandler();
        case    'app-setup': return new AppSetupHandler();
        case       'script': return new ScriptHandler();
        case 'rsmq-monitor': return new RMonitorHandler();
    }
    throw new TypeError('Invalid type');
}
