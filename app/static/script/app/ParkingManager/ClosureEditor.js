/**
 * @require ParkingManager.js
 */

ParkingManager.ClosureEditor = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = app_closureeditor */
    ptype: "app_closureeditor",
    
    /** api: config[searchLabel]
     *  ``String``
     *  Label for search input (i18n).
     */
    searchLabel: "Search",
    
    /** api: config[safePanels]
     *  ``Array`` List of ids of panels on the same accordion that are
     *  safe to switch to while this tool is active. When switching to any
     *  other panel, this tool will be activated.
     */
    
    /** api: config[spacesManager]
     *  ``String`` FeatureManager for the Spaces layer
     */
    
    /** api: config[closureManager]
     *  ``String`` FeatureManager for the Closures layer
     */
     
    /** api: config[id]
     *  ``String`` id to reference this tools. To reference the output target
     *  of the :class:`gxp.plugins.FeatureGrid` that this tool creates, use
     *  this tool's id and append "-gridoutput".
     */
    
    /** private: property[geomModified]
     *  ``Object`` keys are feature ids of features with modified geometries;
     *  value is true
     */
    
    /** private: property[spacesAttribute]
     *  ``String`` the name of the spaces attribute
     */
    
    /** private override */
    autoActivate: false,
    
    /** api: method[init]
     */
    init: function(target) {
        ParkingManager.ClosureEditor.superclass.init.apply(this, arguments);
        
        var closureManager = target.tools[this.closureManager];
        this.geomModified = {};
        
        this.featureGridTarget = Ext.id();
        
        closureManager.on("layerchange", function() {
            var removing = false;
            closureManager.featureLayer.events.on({
                "featureselected": function(evt) {
                    removing = false;
                    evt.feature.state ?
                        this.setSpaces(evt.feature) :
                        this.selectSpaces(evt.feature);
                },
                "featureunselected": function(evt) {
                    target.tools[this.spacesManager].featureStore.removeAll();
                },
                "featureremoved": function(evt) {
                    if (removing === false) {
                        removing = true;
                        target.tools[this.spacesManager].featureStore.removeAll();
                    }
                },
                "vertexmodified": function(evt) {
                    this.geomModified[evt.feature.id] = true;
                },
                "vertexremoved": function(evt) {
                    this.geomModified[evt.feature.id] = true;
                },
                scope: this
            })
        }, this, {single: true});
        closureManager.on("layerchange", function(tool, layer, schema) {
            if (schema) {
                var spaceField = schema.getAt(schema.find("name", /^spaces$/i));
                this.spacesAttribute = spaceField.get("name");
            }
            closureManager.featureStore && closureManager.featureStore.on({
                "update": function(store, record, operation) {
                    var feature = record.getFeature();
                    if (operation === Ext.data.Record.COMMIT) {
                        this.geomModified[feature.id] = true;
                    }
                    if (!feature.attributes[this.spacesAttribute] || this.geomModified[feature.id]) {
                        delete this.geomModified[feature.id];
                        this.setSpaces(feature);
                    }
                },
                scope: this
            })
        }, this);

        // use the FeatureGrid plugin for this tool's feature grid
        new gxp.plugins.FeatureGrid({
            featureManager: this.closureManager,
            outputTarget: this.featureGridTarget,
            outputConfig: {border: false, id: this.id + "-gridoutput"},
            alwaysDisplayOnMap: true
        }).init(target);
    },
    
    addOutput: function(config) {
        var output;
        
        function filter () {
            var filters = [];
            var description = output.description.getValue();
            var effectiveFrom = output.effectiveFrom.getValue();
            effectiveFrom = effectiveFrom instanceof Date ? effectiveFrom.format("c") : "1970-01-01";
            var effectiveTo = output.effectiveTo.getValue();
            effectiveTo = effectiveTo instanceof Date ? effectiveTo.format("c") : "2169-12-31";
            if (output.description.getValue()) {
                filters.push(new OpenLayers.Filter.Comparison({
                    type: OpenLayers.Filter.Comparison.LIKE,
                    property: "event_desc",
                    value: "*" + output.description.getValue() + "*"
                }))
            }
            filters.push(new OpenLayers.Filter.Comparison({
                type: OpenLayers.Filter.Logical.OR,
                filters: [
                    new OpenLayers.Filter.Comparison({
                        type: OpenLayers.Filter.Comparison.BETWEEN,
                        property: "eff_from_dt",
                        lowerBoundary: effectiveFrom,
                        upperBoundary: effectiveTo
                    }),
                    new OpenLayers.Filter.Comparison({
                        type: OpenLayers.Filter.Comparison.BETWEEN,
                        property: "eff_to_dt",
                        lowerBoundary: effectiveFrom,
                        upperBoundary: effectiveTo
                    })
                ]
            }))
            var filter;
            if (filters.length) {
                filter = new OpenLayers.Filter.Logical({
                    type: OpenLayers.Filter.Logical.AND,
                    filters: filters
                })
            }
            this.target.tools[this.closureManager].loadFeatures(filter);
        }
        
        output = ParkingManager.ClosureEditor.superclass.addOutput.call(this, {
            xtype: "container",
            layout: "border",
            items: [{
                xtype: "form",
                region: "north",
                border: false,
                labelWidth: 80,
                height: 126,
                bodyStyle: "padding: 5px",
                items: [{
                    xtype: "fieldset",
                    title: this.searchLabel,
                    defaults: {anchor: "100%"},
                    items: [{
                        xtype: "textfield",
                        ref: "../../description",
                        hideLabel: true,
                        validationDelay: 500,
                        listeners: {
                            "valid": filter,
                            "focus": function(field) {
                                field.reset();
                            },
                            scope: this
                        }
                    }, {
                        xtype: "datefield",
                        ref: "../../effectiveFrom",
                        fieldLabel: "Effective from",
                        listeners: {
                            "valid": filter,
                            scope: this
                        }
                    }, {
                        xtype: "datefield",
                        ref: "../../effectiveTo",
                        fieldLabel: "Effective to",
                        listeners: {
                            "valid": filter,
                            scope: this
                        }
                    }]                    
                }]
            }, {
                id: this.featureGridTarget,
                xtype: "container",
                region: "center",
                layout: "fit"
            }]
        });
        
        var container = Ext.getCmp(this.outputTarget) || this.target.portal[this.outputTarget];
        container.on({
            "expand": this.activate,
            "collapse": function() {
                if (!this.safe) {
                    this.deactivate();
                }
            },
            scope: this
        });
        
        if (this.safePanels) {
            for (var i=this.safePanels.length-1; i>=0; --i) {
                Ext.getCmp(this.safePanels[i]).on({
                    "beforeexpand": function() {this.safe = true;},
                    "collapse": function(panel) {
                        this.safe = false;
                        var activeItem = container.ownerCt.layout.activeItem.id;
                        if (activeItem != this.outputTarget && this.safePanels.indexOf(activeItem) == -1) {
                            this.deactivate();
                        }
                    },
                    scope: this
                });
            }
        }
    },
    
    activate: function() {
        if (ParkingManager.ClosureEditor.superclass.activate.apply(this, arguments)) {
            this.target.tools[this.closureManager].activate();
            var spacesManager = this.target.tools[this.spacesManager];
            spacesManager.clearFeatures();
            spacesManager.showLayer(this.id);
        }
    },
    
    deactivate: function() {
        if (ParkingManager.ClosureEditor.superclass.deactivate.apply(this, arguments)) {
            this.target.tools[this.closureManager].deactivate();
            var spacesManager = this.target.tools[this.spacesManager];
            spacesManager.clearFeatures();
            spacesManager.hideLayer(this.id);
        }
    },
    
    setSpaces: function(feature) {
        var closureManager = this.target.tools[this.closureManager];
        var spacesManager = this.target.tools[this.spacesManager];
        var filter = new OpenLayers.Filter.Spatial({
            type: OpenLayers.Filter.Spatial.DWITHIN,
            value: feature.geometry,
            distance: 5
        });
        var rec = closureManager.featureStore.getRecordFromFeature(feature);
        var currentFids = (rec.get(this.spacesAttribute) || "").split(",");
        spacesManager.loadFeatures(filter, function(features) {
            var fids = new Array(features.length);
            for (var i=features.length-1; i>=0; --i) {
                fids[i] = features[i].fid.split(".").pop();
            }
            rec.set(this.spacesAttribute, fids.join(","));
        });
    },
    
    selectSpaces: function(feature) {
        if (feature.attributes.spaces) {
            var fids = feature.attributes[this.spacesAttribute].split(",");
            var filter = new OpenLayers.Filter.FeatureId({fids: fids});
            this.target.tools[this.spacesManager].loadFeatures(filter);
        }
    }
    
});

Ext.preg(ParkingManager.ClosureEditor.prototype.ptype, ParkingManager.ClosureEditor);
