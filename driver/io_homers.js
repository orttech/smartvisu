/**
 * -----------------------------------------------------------------------------
 * @package     smartVISU
 * @author      Martin Gleiß, Patrik Germann
 * @copyright   2012 - 2020
 * @license     GPL [http://www.gnu.de]
 * -----------------------------------------------------------------------------
 * @label       HOMERS
 */

/**
 * Class for controlling all communication with a connected system. There are
 * simple I/O functions, and complex functions for real-time values.
 */
var io = {

    // the URL
    url: '',

    // the debug switch
    debug: false,

    // -----------------------------------------------------------------------------
    // P U B L I C   F U N C T I O N S
    // -----------------------------------------------------------------------------

    /**
     * Does a read-request and adds the result to the buffer
     *
     * @param      the item
     */
    read: function (item) {
        io.debug && console.debug("io.read(item = " + item + ")");

        $.ajax({
            url: io.url + "homeauto/item/" + item,
            type: "GET"
        }).done(function (state) {
            io.debug && console.debug("io.read: widget.update(item = " + item + ", value = " + state + ")");
            widget.update(item, state);
            /*if (io.plot.listeners[item] && Date.now() - io.plot.items[io.plot.listeners[item]] > io.plot.timer * 1000) {
                io.plot.get(io.plot.listeners[item]);
            }*/
        }).error(notify.json);
    },

    /**
     * Does a write-request with a value
     *
     * @param      the item
     * @param      the value
     */
    write: function (item, val) {
        io.debug && console.debug("io.write(item = " + item + ", val = " + val + ")");

        $.ajax({
            url: io.url + "homeauto/item/" + item,
            data: JSON.stringify(val),
            method: "POST"
        }).success(function () {
            widget.update(item, val);
        }).error(notify.json);

    },

    /**
     * Trigger a logic
     *
     * @param      the logic
     * @param      the value
     */
    trigger: function (name, val) {
        io.debug && console.debug("io.trigger(name = " + name + ", val = " + val + ")");
    },

    /**
     * Initializion of the driver
     *
     * @param      the ip or url to the system (optional)
     * @param      the port on which the connection should be made (optional)
     */
    init: function (address, port) {
        io.debug && console.debug("Type 'io.debug=true;' to console to see more details.");
        io.debug && console.debug("io.init(address = " + address + ", port = " + port + ")");

        io.url = "http://" + address + (port ? ":" + port : '') + "/";
    },

    widgetChangesListeners: [],
    /**
     * Lets the driver work
     */
    run: function (realtime) {
        io.debug && console.debug("io.run(realtime = " + realtime + ")");

        /*if (io.eventListener.readyState == 0 || io.eventListener.readyState == 1) {
            io.eventListener.close();
        }
        if (io.refreshIntervall) {
            clearTimeout(io.refreshIntervall);
            io.refreshIntervall = false;
        }*/

        if (widget.listeners().length) {
            var items = widget.listeners();
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                io.read(item);
                if (realtime) {
                    io.widgetChangesListeners[item] = new EventSource(io.url + "homeauto/item/" + item + "/changes");
                    io.widgetChangesListeners[item].onmessage = (
                        function (item) {
                            return function (msg) {
                                widget.update(item, JSON.parse(msg.data));
                                if (io.plot.listeners[item] && Date.now() - io.plot.items[io.plot.listeners[item]] > io.plot.timer * 1000) {
                                    io.plot.get(io.plot.listeners[item]);
                                }
                            }
                        }(item));
                }
            }
        }

        io.plot.init();

        if (realtime) {

            //if (typeof EventSource == 'function') {
            //	io.eventListener = new EventSource(io.url + "events?topics=smarthome/items/*/statechanged");
            /*	io.eventListener.onmessage = function(message) {
                    var event = JSON.parse(message.data);				
                    if (event.type.substr(-21) == 'ItemStateChangedEvent') {
                        var item = event.topic.split('/')[2];
                        var val = JSON.parse(event.payload).value;
                        io.debug && console.debug("io.start.eventmessage: item = " + item + ", value = " + val + ")");
                        if (widget.listeners().includes(item)) {
                            val = io.convertState(item, val);
                            io.debug && console.debug("io.start.event: widget.update(item = " + item + ", value = " + val + ")");
                            widget.update(item, val);
                        }
                        if (io.plot.listeners[item] && Date.now() - io.plot.items[io.plot.listeners[item]] > io.plot.timer * 1000) {
                            io.plot.get(io.plot.listeners[item]);
                        }
                    }
                }
            } else {
                if (!io.refreshIntervall && widget.listeners().length) {
                    io.refreshIntervall = setInterval(function() {
                        var item = widget.listeners();
                        for (var i = 0; i < widget.listeners().length; i++) {
                            io.read(item[i]);
                        }
                    }, io.timer * 1000);
                }
            }*/
        }
    },


    // -----------------------------------------------------------------------------
    // C O M M U N I C A T I O N   F U N C T I O N S
    // -----------------------------------------------------------------------------
    // The functions in this paragraph may be changed. They are all private and are
    // only be called from the public functions above. You may add or delete some
    // to fit your requirements and your connected system.

    itemType: new Array(),
    eventListener: false,
    refreshIntervall: false,
    timer: 1,

    plot: {
        items: new Array(),
        listeners: new Array(),
        timer: 60,

        init: function () {
            io.debug && console.debug("io.plot.init()");

            io.plot.listeners = new Array();
            widget.plot().each(function (idx) {
                var items = widget.explode($(this).attr('data-item'));
                for (var i = 0; i < items.length; i++) {
                    var plotItem = items[i];
                    var pt = plotItem.split('.');
                    if (!io.plot.items[plotItem] && (pt instanceof Array) && widget.checkseries(plotItem)) {
                        if (pt[3] == 'now') {
                            io.plot.listeners[pt[0]] = plotItem;
                        }
                        io.plot.get(plotItem);
                        io.plot.items[plotItem] = true;
                    }
                }
            });
        },

        get: function (plotItem) {
            io.debug && console.debug("io.plot.get(plotItem = " + plotItem + ")");

            var pt = plotItem.split('.');
            var item = pt[0];
            var tmin = new Date().duration(pt[2]);
            var tmax = pt[3];
            var limit = pt[4];

            var starttime = new Date(Date.now() - tmin);
            var url = io.url + "postgrest/rpc/getfitem?id=" + item + "&limit=" + limit; // + "?starttime=" + starttime.toISOString();
            io.debug && console.debug(url);
            /*
            if (tmax != 'now') {
                tmax = new Date().duration(pt[3]);
                var endtime = new Date(new Date() - tmax);
                url += "&endtime=" + endtime.toISOString();
            }*/

            $.ajax({
                url: url,
                type: 'GET'
            }).done(function (persistence) {
                //console.log(persistence);
                var plotData = new Array();
                if (persistence.length > 0) {
                    $.each(persistence, function (key, data) {
                        /*console.log(data);
                        console.log(key);
                        console.log(item);
                        var val = io.convertState(item, data.state);
                        if (isNaN(val)) {
                            val = 0;
                        } else if (Number(val) == val && val % 1 !== 0) { //isFloat
                            val = parseFloat(val).toFixed(2);
                        }*/
                        plotData.push([data.t, data.val]);
                    })
                    plotData.sort(function (a, b) {
                        return a[0] - b[0];
                    });
                } else {
                    plotData.push([Date.parse(starttime), 0]);
                    plotData.push([endtime ? Date.parse(endtime) : Date.now(), 0])
                }
                io.plot.items[plotItem] = Date.now();
                console.log("io.plot.get: widget.update(plotItem = " + plotItem + ", plotData = " + plotData + ")");
                console.log(plotData);
                widget.update(plotItem, plotData);
            }).error(notify.json);
        }
    }
}
