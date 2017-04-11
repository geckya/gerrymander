"use strict"

var wsURL = "ws" + (window.location.protocol === "https:" ? "s" : "") + "://" + window.location.hostname + "/ws/";
var upload, uploadButton, csvdata1, csvdata2;

var ws;

var states = {
    "AL": ["Alabama", 1],
    "AK": ["Alaska", 2],
    "AZ": ["Arizona", 3],
    "AR": ["Arkansas", 4],
    "CA": ["California", 5],
    "CO": ["Colorado", 6],
    "CT": ["Connecticut", 7],
    "DE": ["Delaware", 8],
    "FL": ["Florida", 9],
    "GA": ["Georgia", 10],
    "HI": ["Hawaii", 11],
    "ID": ["Idaho", 12],
    "IL": ["Illinois", 13],
    "IN": ["Indiana", 14],
    "IA": ["Iowa", 15],
    "KS": ["Kansas", 16],
    "KY": ["Kentucky", 17],
    "LA": ["Louisiana", 18],
    "ME": ["Maine", 19],
    "MD": ["Maryland", 20],
    "MA": ["Massachusetts", 21],
    "MI": ["Michigan", 22],
    "MN": ["Minnesota", 23],
    "MS": ["Mississippi", 24],
    "MO": ["Missouri", 25],
    "MT": ["Montana", 26],
    "NE": ["Nebraska", 27],
    "NV": ["Nevada", 28],
    "NH": ["New Hampshire", 29],
    "NJ": ["New Jersey", 30],
    "NM": ["New Mexico", 31],
    "NY": ["New York", 32],
    "NC": ["North Carolina", 33],
    "ND": ["North Dakota", 34],
    "OH": ["Ohio", 35],
    "OK": ["Oklahoma", 36],
    "OR": ["Oregon", 37],
    "PA": ["Pennsylvania", 38],
    "RI": ["Rhode Island", 39],
    "SC": ["South Carolina", 40],
    "SD": ["South Dakota", 41],
    "TN": ["Tennessee", 42],
    "TX": ["Texas", 43],
    "UT": ["Utah", 44],
    "VT": ["Vermont", 45],
    "VA": ["Virginia", 46],
    "WA": ["Washington", 47],
    "WV": ["West Virginia", 48],
    "WI": ["Wisconsin", 49],
    "WY": ["Wyoming", 50],
}

$(document).ready(function(){
    upload = document.getElementById("upload");
    uploadButton = document.getElementById("useFile");
    csvdata1 = document.getElementById("csvdata1");
    csvdata2 = document.getElementById("csvdata2");

    function csvKeydown(toFocus) {
        return (function(e) {
            if (!e) e = window.event;
            var keyCode = e.keyCode || e.which;
            if (keyCode == 9) { // tab
                // switch to the other input box
                e.preventDefault();
                toFocus.focus();

                // put in a newline if necessary
                toFocus.value = toFocus.value.trimRight();
                toFocus.value += (toFocus.value.length === 0 ? "" : "\n");
            }
        });
    }
    csvdata1.onkeydown = csvKeydown(csvdata2);
    csvdata2.onkeydown = csvKeydown(csvdata1);

    wsConnect();

    // scroll to the results div after clicking submit
    $('#submit').click(function() {
        var ret = submitData();

        if (ret) {
            $('html, body').animate( {
                scrollTop: $("#results").offset().top
            }, 500);
        }
    });

});

function wsConnect(onOpen) {
    onOpen = onOpen || function(){};
    ws = new WebSocket(wsURL);
    ws.onerror = function(evt) {
    }
    ws.onmessage = onMessage;
    ws.onopen = function(evt) {
        onOpen();
    }
}

function getFromFile() {
    if ('files' in upload && upload.files.length > 0) {
        var reader = new FileReader();
        reader.onloadstart = function() {
            $("#submit").css('display', 'none');
            $("#loading_file").css('display', '');
        }
        reader.onloadend = function() {
            // TODO error checking
            $("#submit").css('display', '');
            $("#loading_file").css('display', 'none');
            document.filetext = reader.result;
        }
        reader.readAsText(upload.files[0]);
    } else {
        alert("No files chosen");
        document.filetext = undefined;
    }
}

function check(id) {
    $('#' + id).trigger('click');
}

function staterange(exclude) {
    exclude = exclude === undefined ? [] : exclude;
    var a = new Array(50);
    for (var i = 0; i < a.length; i++) {
        a[i] = i + 1;
    }
    for (var i = 0; i < exclude.length; i++) {
        var index = a.indexOf(exclude[i]);
        if (index > -1) {
            a.splice(index, 1);
        }
    }
    return a;
}

// return null if error, or a 1D or 2D array
function textboxesToCsv() {
    var data1 = csvdata1.value;
    var data2 = csvdata2.value;
    var rows1 = data1.trim().split("\n");
    var rows2 = data2.trim().split("\n");

    if (data1 === "" && data2 === "") {
        alert("No data!");
        return null;
    }

    if (rows1.length != rows2.length && data1 !== "" && data2 !== "") {
        alert("Columns do not have the same length");
        return null;
    }

    if (rows1.length == rows2.length) {
        return rows1.map((x,c)=>x+","+rows2[c]);
    } else if (rows1.length > 0) {
        return rows1;
    } else  {
        return rows2;
    }
}

// validate the data that we're submitting to the backend
// convert (if necessary) to the format that the backend expects
function verifyCsv(rows) {
    if (rows.length < 2) {
        alert("Not enough data!");
        return null;
    }

    var errors = [];

    var nocomma = 0, onecomma = 0;
    for (var i = 0; i < rows.length; i++) {
        function err(str) {
            errors.push("Row " + (i + 1) + ": " + str);
        }

        var elems = rows[i].split(",").map(function(s){return s.trim()});
        var badNum = false;

        // check that we have only numbers
        // TODO use the Number() constructor instead?
        var re = /^[0-9]*\.?[0-9]+$/;
        for (var j = 0; j < elems.length; j++) {
            if (!re.test(elems[j])) {
                err("bad number: " + elems[j]);
                badNum = true;
            }
        }

        // make sure the numbers in a row add to 1 (or 100)
        function checkSum(sum) {
            if (sum == 0) {
                err("row adds up to 0");
            }
        }

        // check number of commas in line
        if (elems.length == 1) {
            nocomma++;
            checkSum(Number(elems[0]));
        } else if (elems.length == 2) {
            onecomma++;
            if (!badNum) {
                var sum = Number(elems[0]) + Number(elems[1]);
                checkSum(sum);
            }
        } else {
            err("too many commas");
        }
    }

    if (errors.length > 0) {
        alert(errors.join("\n"));
        return null;
    }

    if (nocomma != 0 && onecomma != 0) {
        alert("Inconsistent number of columns");
        return null;
    }

    var vals = [];
    if (nocomma != 0) {
        var zeroone = true;
        var zerohundred = true;
        for (var i = 0; i < rows.length; i++) {
            zeroone &= (Number(rows[i]) < 1);
            zerohundred &= (Number(rows[i]) < 100);
        }

        if (zeroone) {
            for (var i = 0; i < rows.length; i++) {
                vals[i] = Number(rows[i]);

            } 
        } else if (zerohundred) {
            for (var i = 0; i < rows.length; i++) {
                vals[i] = Number(rows[i]) / 100.0;
            }
        } else {
            alert("Value over 100");
            return null;
        }
    } else {
        for (var i = 0; i < rows.length; i++) {
            var elems = rows[i].split(',');
            vals[i] = Number(elems[0])/(Number(elems[0]) + Number(elems[1]));
        }
    }

    return vals.join(",");
}

function submitData() {
    // validate
    var f = document.forms[0];
    if (!f.reportValidity()) { // TODO polyfill? Or just don't do this?
        return false;
    }

    var data_obj =  {
        "year": null,
        "states": null,
        "yearbaseline": null,
        "statebaseline": null,
        "imputedzero": null,
        "symm": null,
        "state_label": null,
    }

    // figure out which option was chosen
    var input_type = $('input[name="input_type"]:checked').val();
    switch (input_type) {
        case '1':
            data_obj['year'] = document.getElementById('year').value;
            var abbr = document.getElementById('state').value;
            data_obj['states'] = states[abbr][1].toString();
            data_obj['state_label'] = states[abbr][0];
            break;

        case '2':
            data_obj['year'] = '0';
            data_obj['state_label'] = document.getElementById('opt2_state_label').value;
            var csv = document.filetext.split('\n');
            var data = verifyCsv(csv);
            if (data === null) return false;
            data_obj['states'] = data;
            break;

        case '3':
            data_obj['year'] = '0';
            data_obj['state_label'] = document.getElementById('opt3_state_label').value;
            var csv = textboxesToCsv();
            var data = verifyCsv(csv);
            if (data === null) return false;
            data_obj['states'] = data;
            break;

        default:
            alert("Please select a data set (Step 1)");
            return false;
    }

    var imp = $('input[name="unc"]:checked').val()
        data_obj['imputedzero'] = imp === 'other' ? document.getElementById('uncotherbox').value : imp;

    var step3 = $('input[name="step3opt"]:checked').val();
    switch (step3) {
        case "house":
            data_obj['yearbaseline'] = $("#step3year").val();
            var statestouse = $('input[name="states_to_use"]:checked').val();
            switch (statestouse) {
                case "all":
                    data_obj['statebaseline'] = staterange().join(',');
                    break;

                case "omit":
                    var checked = $('#step3states').val();
                    if (checked == null) {
                        alert("Select some states to omit in fantasy delegations (Step 3)");
                        return false;
                    }
                    var exclude = checked.map(x => states[x][1]);
                    data_obj['statebaseline'] = staterange(exclude).join(',');
                    break;

                default:
                    alert("You must select which states to use for fantasy delegations (Step 3)");
                    return false;
            }
            break;

        case "other":
            data_obj['yearbaseline'] = '0';
            data_obj['statebaseline'] = '0';
            break;

        default:
            alert("No option selected for Step 3");
            return false;
    }

    var clustering = $('input[name="clustering"]:checked').val();
    if (clustering == "random") {
        data_obj['symm'] = '1';
    } else {
        data_obj['symm'] = '0';
    }

    // if (clustering === 'same') {
    //     // first option
    //     data_obj['yearbaseline'] = data_obj['year'];
    //     data_obj['statebaseline'] = '0';
    //     data_obj['symm'] = '0';
    // } else {
    //     // second option
    //     data_obj['yearbaseline'] = data_obj['year'];
    //     data_obj['statebaseline'] = '0';
    //     data_obj['symm'] = '1';
    // }

    // if (clustering === 'none' && input_type == '1') {
    //     alert('Error in Step 3: This option not allowed for U.S. House data sets');
    //     return;
    // }


    // // validate
    // var data = validateAndConvertSubmit();
    // if (data === null) return;
    // var data = JSON.stringify( {
    //     "data": data,
    //     "year": document.getElementById("settings_year").value,
    //     "state": document.getElementById("settings_state").value,
    // });

    function submit() {
        console.log(data_obj);
        var data = JSON.stringify(data_obj);
        ws.send(data);
        document.getElementById("results_html").innerHTML = '';
        $('#results_loading').css("display", "");
        $('#pdf_link_span').css("display", "none");
    }

    // check connection
    if (ws.readyState !== ws.OPEN) {
        wsConnect(submit);
    } else {
        // send data
        submit();
    }

    return true;
}

function setStatus(msg) {
    if (!msg) {
        $('#results_loading').css("display", "none");
    } else {
        $('#results_loading').css("display", "");
        $('#status').html(msg);
    }
}

// handle a reply from the backend
function onMessage(evt) {
    var data = JSON.parse(evt.data);
    
    if (data.type === "error") {
        setStatus(false);
        alert(data.errMsg);
    } else if (data.type === "info") {
        setStatus(data.data);
    } else if (data.type === "part1") {
        $("#results_html").html(data.data);
    } else if (data.type === "part2") {
        setStatus(false);
        // display results
        document.getElementById("results_html").innerHTML = data.data;

        // download link
        $("#pdf_link_span").css("display", "");
        $("#pdf_link").prop("href", data.pdf_url);
    } else {
        console.log("could not parse message:", data);
        alert("Something went wrong. Please contact site administrators.");
    }
}

