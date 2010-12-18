

var ParkingManager = Ext.extend(gxp.Viewer, {

    defaultSourceType: "gx_wmssource",

    constructor: function(config) {

        this.popupCache = {};

        config.mapItems = [{
            xtype: "gx_zoomslider",
            vertical: true,
            height: 100
        }];

        config.portalItems = [{
            region: "center",
            layout: "border",
            tbar: {
                id: "paneltbar",
                items: [{
                    iconCls: "icon-geoexplorer",
                    disabled: true
                }, "SFPark", "-"]
            },
            items: [{
                xtype: "tabpanel",
                region: "west",
                width: 200,
                split: true,
                activeTab: 0,
                items: [{
                    id: "tree",
                    title: "Layers",
                    xtype: "container",
                    layout: "fit"
                }, {
                    title: "Legend",
                    xtype: "gx_legendpanel",
                    defaults: {style: {padding: "5px"}}
                }]
            }, "map"]
        }];

        config.tools = [{
            ptype: "gx_layertree",
            outputTarget: "tree"
        }, {
            ptype: "gx_featuremanager",
            id: "featuremanager",
            paging: false
        }, {
            ptype: "gx_featureeditor",
            featureManager: "featuremanager",
            autoLoadFeatures: true,
            actionTarget: "paneltbar",
            toggleGroup: "main",
            autoLoadFeatures: true
        }];
        

        ParkingManager.superclass.constructor.apply(this, arguments);

        this.on({
            ready: this.addCustomTools,
            scope: this
        });
    },
    
    addCustomTools: function() {
        var toolbar = Ext.getCmp("paneltbar");
        toolbar.add(this.createInfoAction());
        toolbar.doLayout();
    },
    
    createInfoAction: function() {
        var store = this.mapPanel.layers;
        var index = store.findExact("name", "sfpark:spaces");
        var record = store.getAt(index);
        var layer = record.getLayer();
        
        var popup;
        function displayPopup(event) {
            if (popup) {
                popup.close();
            }
            var feature = event.features && event.features[0];
            if (feature) {
                popup = new GeoExt.Popup({
                    location: event.xy,
                    map: this.mapPanel,
                    items: [{
                        xtype: "tabpanel",
                        border: false,
                        activeTab: 0,
                        width: 300,
                        height: 300,
                        items: [{
                            xtype: "gx_googlestreetviewpanel",
                            title: "Street View"
                        }, {
                            xtype: "container",
                            title: "Details",
                            autoScroll: true,
                            items: [{
                                xtype: "propertygrid",
                                autoHeight: true,
                                source: feature.attributes
                            }]
                        }]
                    }]
                });
                popup.show();
            }
        }
        
        return new GeoExt.Action({
            tooltip: "Get Parking Space Info",
            iconCls: "gx-icon-getfeatureinfo",
            toggleGroup: "main",
            enableToggle: true,
            allowDepress: true,
            map: this.mapPanel.map,
            control: new OpenLayers.Control.WMSGetFeatureInfo({
                maxFeatures: 1,
                infoFormat: "application/vnd.ogc.gml",
                queryVisible: false,
                layers: [layer],
                eventListeners: {
                    getfeatureinfo: displayPopup,
                    scope: this
                }
            })
        });
        
    }

});