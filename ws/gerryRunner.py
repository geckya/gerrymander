from subprocess import Popen, PIPE, CalledProcessError, call
import re
import json
import base64
import matlab.engine
from matlab import double
from datetime import datetime
import os
import logging

# logger = logging.getLogger("gerrymander")
log = open('request_log.txt', 'a')

def error(msg):
    resp = {}
    resp["type"] = "error"
    resp["errMsg"] = msg
    return json.dumps(resp)

def success(result, url, part):
    resp = {}
    resp["type"] = "part%d" % part
    resp["data"] = result
    resp['pdf_url'] = url
    return json.dumps(resp)

def status(status):
    resp =  {
            "type": "info",
            "data": status
            }
    return json.dumps(resp)

def runData(payload, ip, sendMessage):
    def convert(x, statebaseline=False):
        if x.find(',') == -1:
            return int(x)
        xs = x.split(',')
        l = [(float(y) if statebaseline else [0,0,float(y)]) for y in xs]
        return double(l)

    def cleanup(prefix):
        # move the PDF to the data directory, remove other files
        call(['mv', '%s.pdf' % prefix, 'data/'])
        try:
            os.remove('%s.html' % prefix)
        except:
            pass
        try:
            os.remove('%s_converted.html' % prefix)
        except:
            pass
        try:
            os.remove('%s_converted_hires.html' % prefix)
        except:
            pass
        for img in ["Test1", "Test2a", "Test2b", "Test3"]:
            try:
                os.remove('%s_%s.jpg' % (prefix, img))
            except:
                pass
            try:
                os.remove('%s_%s_hires.jpg' % (prefix, img))
            except:
                pass

    # extract data from payload
    obj = json.loads(payload)
    print "request:", obj

    year = int(obj['year'])
    states = convert(obj['states'])
    yearbaseline = int(obj['yearbaseline'])
    statebaseline = convert(obj['statebaseline'], True)
    imputedzero = float(obj['imputedzero']) / 100.0 # need number [0,1]
    symm = int(obj['symm'])
    state_label = obj['state_label']

    # run MATLAB processes
    t = datetime.now()
    prefix = t.isoformat()
    print "starting MATLAB engine"
    sendMessage(status("Starting MATLAB"))
    try:
        eng=matlab.engine.start_matlab()
    except:
        sendMessage(error("Could not start MATLAB. Please try again later or contact Sam Wang"))
        return

    print "running part 1"
    sendMessage(status("Running Tests of Intents"))
    try:
        ret = eng.gerrymander_tests_part1(year, states, yearbaseline, statebaseline, imputedzero, symm, state_label, prefix, nargout=1)
    except Exception as e:
        print "MATLAB error"
        sendMessage(error("Problem running MATLAB: %s" % e.message))
        cleanup(prefix)
        return

    # modify produced HTML
    with open("%s.html" % prefix, "r") as html_file:
        html = html_file.read()
        html_hires = html

    def base64replace(img_prefix, html, html_hires):
        try:
            with open("%s.jpg" % img_prefix, "rb") as img_file:
                encoded_string = base64.b64encode(img_file.read())
                html = html.replace("%s.jpg" % img_prefix, "data:image/jpg;base64,%s" % encoded_string)
            with open("%s_hires.jpg" % img_prefix, "rb") as img_file:
                encoded_string = base64.b64encode(img_file.read())
                html_hires = html_hires.replace("%s.jpg" % img_prefix, "data:image/jpg;base64,%s" % encoded_string)
        except IOError as e:
            print "%s.jpg not found" % img_prefix

        return (html, html_hires)

    html, html_hires = base64replace("%s_Test1" % prefix, html, html_hires)
    html, html_hires = base64replace("%s_Test2a" % prefix, html, html_hires)
    html, html_hires = base64replace("%s_Test2b" % prefix, html, html_hires)

    if ret:
        sendMessage(success(html, None, 1));
        sendMessage(status("Running Analysis of Effects"))
        print "running part 2"
        try:
            ret = eng.gerrymander_tests_part2(nargout=0)
        except Exception as e:
            print "MATLAB error"
            sendMessage(error("Problem running MATLAB: %s" % e.message))
            cleanup(prefix)
            return

    else:
        sendMessage(success(html, None, 2)); # no more output
        cleanup(prefix)

    eng.exit()
    print "MATLAB exited successfully"

    with open("%s.html" % prefix, "r") as html_file:
        html = html_file.read()
        html_hires = html
    html, html_hires = base64replace("%s_Test1" % prefix, html, html_hires)
    html, html_hires = base64replace("%s_Test2a" % prefix, html, html_hires)
    html, html_hires = base64replace("%s_Test2b" % prefix, html, html_hires)
    html, html_hires = base64replace("%s_Test3" % prefix, html, html_hires)

    # modify html for PDF
    html_hires = "%s\n%s" % ('<img src="staticfiles/gerrymander_output_header.jpg" class="banner">\n', html_hires)

    with open("%s_converted.html" % prefix, "w") as html_converted:
        html_converted.write(html)
    with open("%s_converted_hires.html" % prefix, "w") as html_converted:
        html_converted.write(html_hires)

    # make a PDF
    call(['./wkhtmltopdf', '-s', 'Letter', '--user-style-sheet', 'staticfiles/pdf.css', "%s_converted_hires.html" % prefix, "%s.pdf" % prefix])
    # date, ip, request params, output pdf
    log.write('%s,%s,%s,%s\n' % (t.strftime('%Y-%m-%d %H:%M'), ip, payload, '%s.pdf' % prefix))
    log.flush()

    sendMessage(success(html, "/data/%s.pdf" % prefix, 2))
    cleanup(prefix)
