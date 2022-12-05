import GoshHandler from "./Handlers/GoshHandler";
import AppReadHandler from "./Handlers/AppReadHandler";
import AppWriteHandler from "./Handlers/AppWriteHandler";
import ExtReadHandler from "./Handlers/ExtReadHandler";
import RemoteReadHandler from "./Handlers/RemoteReadHandler";
import RemoteWriteHandler from "./Handlers/RemoteWriteHandler";
import AppRotateHandler from "./Handlers/AppRotateHandler";
import SeedReadHandler from "./Handlers/SeedReadHandler";
import RootCheckHandler from "./Handlers/RootCheckHandler";
import AppSetupHandler from "./Handlers/AppSetupHandler";
import ScriptHandler from "./Handlers/ScriptHandler";

export type HandlerType = 'app-read' | 'extui-read' | 'remote-read'
    | 'app-write' | 'extui-write' | 'remote-write' | 'app-rotate'
    | 'seed-read' | 'root-check' | 'app-setup' | 'script';

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
        case   'root-check': return new RootCheckHandler();
        case    'app-setup': return new AppSetupHandler();
        case       'script': return new ScriptHandler();
    }
    throw new TypeError('Invalid type');
}
