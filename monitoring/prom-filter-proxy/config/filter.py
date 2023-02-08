# -*- coding: utf-8 -*-
import glob, json, os, re, socket
from typing import Optional
from urllib import parse

from proxy.http.exception import HttpRequestRejected
from proxy.http.parser import HttpParser
from proxy.http.codes import httpStatusCodes
from proxy.http.proxy import HttpProxyBasePlugin

# **********************************************************************************************************************
# Initialization

with open('config/config.json', 'r') as file:
    config = json.load(file)

allow_source = config['source'].encode('ascii')
allow_target = config['target'].encode('ascii')
[allow_method, allow_url] = config['allow'].encode('ascii').split(b' ', 2)
check_var = config['check_var'].encode('ascii')
replacers = {k.encode('ascii'): v.encode('ascii') for (k, v) in config['replacers'].items()}
user_agents = [re.compile(b'^' + v.encode('ascii') + b'$') for v in config['user_agents']]
debug = config['debug']

if debug:
    print(b'Allow requests from ' + allow_source + b' to ' + allow_target)
    print(b'Allow only ' + allow_method + b' ' + allow_url)
    print(b'Checked variable name: ' + check_var)
    print(b'Allowed user agents:')
    for uarx in user_agents:
        print(uarx)

last_boards = {}
simple_matchers = []
complex_matchers = []
def process_dashboards():
    global config, last_boards, simple_matchers, complex_matchers
    last_boards = {}
    simple_matchers = []
    complex_matchers = []
    for filename in glob.glob(config['dashboards']):
        if debug:
            print('Read file ' + filename)
        with open(filename, 'r') as file:
            data = json.load(file)
        last_boards[filename] = os.path.getmtime(filename)
        consts = {}
        if 'templating' in data and 'list' in data['templating']:
            for item in data['templating']['list']:
                if item['type'] == 'constant':
                    if debug:
                        print('Const replacement: $' + item['name'] + ' to ' + item['query'])
                    consts[b'$' + item['name'].encode('ascii')] = item['query'].encode('ascii')
        for panel in data['panels']:
            if 'targets' not in panel:
                continue
            for target in panel['targets']:
                if 'expr' not in target:
                    continue
                expr = target['expr'].encode('ascii')
                regx = None
                for (ck, cv) in consts.items():
                    if ck in expr:
                        expr = expr.replace(ck, cv)
                for (rk, rv) in replacers.items():
                    if rk in expr:
                        regx = (regx if regx is not None else b'^' + re.escape(expr) + b'$').replace(re.escape(rk), rv)
                if regx is not None:
                    cregx = re.compile(regx)
                    if cregx not in complex_matchers:
                        if debug:
                            print(b'Allow regex: ' + regx)
                        complex_matchers.append(cregx)
                else:
                    if expr not in simple_matchers:
                        if debug:
                            print(b'Allow simple: ' + expr)
                        simple_matchers.append(expr)

def maybe_process_dashboards():
    need = False
    boards = glob.glob(config['dashboards'])
    if len(boards) != len(last_boards.keys()):
        need = True
    else:
        for filename in boards:
            if filename not in last_boards:
                need = True
                break
            mtime = os.path.getmtime(filename)
            if mtime != last_boards[filename]:
                need = True
                break
    if need:
        if debug:
            print(b'Dashboards updated, re-processing them')
        process_dashboards()

process_dashboards()

# **********************************************************************************************************************

class FilterPlugin(HttpProxyBasePlugin):

    def before_upstream_connection(self, request: HttpParser) -> Optional[HttpParser]:
        maybe_process_dashboards()
        addr = self.client.addr[0].encode('ascii')
        name = socket.gethostbyaddr(self.client.addr[0])[0].encode('ascii')
        if request.host != allow_target or (addr != allow_source and name != allow_source
                                            and name != allow_source + b'.' + allow_source):  # ... docker!!
            full = addr + b' (' + name + b')'
            if debug:
                print(b'Proxy from ' + full + b' to ' + request.host + b' forbidden')
            raise HttpRequestRejected(status_code=httpStatusCodes.FORBIDDEN, headers={b'Connection': b'close'},
                  body=b'Proxy from ' + full + b' to ' + request.host + b' forbidden')
        if not request.has_header(b'User-Agent'):
            agent = request.header(b'User-Agent')
            match = False
            for uarx in user_agents:
                if uarx.match(agent):
                    match = True
                    break
            if not match:
                if debug:
                    print(b'User-agent ' + agent + b' not allowed!')
                raise HttpRequestRejected(status_code=httpStatusCodes.FORBIDDEN, headers={b'Connection': b'close'},
                      body=b'User-agent ' + agent + b' not allowed!')
        return request

    def handle_client_request(self, request: HttpParser) -> Optional[HttpParser]:
        if request.method != allow_method or request.path != allow_url:
            if debug:
                print(b'Not allowed by filtering rules: ' + request.method + b', ' + request.path)
            raise HttpRequestRejected(httpStatusCodes.FORBIDDEN, body=b'{"error": "Not allowed by filtering rules"}')
        data = parse.parse_qs(request.body)
        if check_var not in data or len(data[check_var]) != 1:
            if debug:
                print(b'Required argument not provided')
            raise HttpRequestRejected(httpStatusCodes.FORBIDDEN, body=b'{"error": "Required argument not provided"}')
        var = data[check_var][0]
        if var in simple_matchers:
            return request
        for regx in complex_matchers:
            if regx.match(var):
                return request
        if debug:
            print(b'Requested resource not allowed: ' + var)
        raise HttpRequestRejected(httpStatusCodes.FORBIDDEN, body=b'{"error": "Requested resource not allowed"}')

    def handle_upstream_chunk(self, chunk: memoryview) -> memoryview:
        return chunk

    def on_upstream_connection_close(self) -> None:
        pass
