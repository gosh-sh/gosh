import GoshHandler from "./Handlers/GoshHandler";
import AppReadHandler from "./Handlers/AppReadHandler";
import AppWriteHandler from "./Handlers/AppWriteHandler";
import ExtReadHandler from "./Handlers/ExtReadHandler";
import RemoteReadHandler from "./Handlers/RemoteReadHandler";
import RemoteWriteHandler from "./Handlers/RemoteWriteHandler";
import AppRotateHandler from "./Handlers/AppRotateHandler";

export type HandlerType = 'app-read' | 'extui-read' | 'remote-read'
    | 'app-write' | 'extui-write' | 'remote-write' | 'app-rotate';

export default function selectHandler(type: HandlerType): GoshHandler {
    switch (type) {
        case    'app-read':  return new AppReadHandler();
        case  'extui-read':  return new ExtReadHandler();
        case 'remote-read':  return new RemoteReadHandler();
        case    'app-write': return new AppWriteHandler();
        case  'extui-write': throw new TypeError('Not implemented');
        case 'remote-write': return new RemoteWriteHandler();
        case   'app-rotate': return new AppRotateHandler();
    }
    throw new TypeError('Invalid type');
}
