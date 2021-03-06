/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the BSD license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/** api: (define)
 *  module = ParkingManager
 *  class = OldAssetEditorPopup
 *  extends = GeoExt.Popup
 */

/** api: constructor
 *  .. class:: OldAssetEditorPopup(config)
 *
 *      Create a new popup which displays forms for editing parking space
 *      attributes.
 */
Ext.namespace("ParkingManager");
ParkingManager.OldAssetEditorPopup = Ext.extend(GeoExt.Popup, {
    
    /** i18n **/
    closeMsgTitle: 'Save Changes?',
    closeMsg: 'This feature has unsaved changes. Would you like to save your changes?',
    deleteMsgTitle: 'Delete Feature?',
    deleteMsg: 'Are you sure you want to delete this feature?',
    editButtonText: 'Edit',
    editButtonTooltip: 'Make this feature editable',
    deleteButtonText: 'Delete',
    deleteButtonTooltip: 'Delete this feature',
    cancelButtonText: 'Cancel',
    cancelButtonTooltip: 'Stop editing, discard changes',
    saveButtonText: 'Save',
    saveButtonTooltip: 'Save changes',
    
    /** private config overrides **/
    layout: "fit",
    
    /** api: config[feature]
     *  ``GeoExt.data.FeatureRecord`` The feature to edit and display.
     */
    
    /** api: config[vertexRenderIntent]
     *  ``String`` renderIntent for feature vertices when modifying. Undefined
     *  by default.
     */
    
    /** api: config[streetViewTitle]
     *  ``String``
     *  Title for street view tab (i18n).
     */
    streetViewTitle: "Street View",

    /** api: config[attributeFormTitle]
     *  ``String``
     *  Title for attribute form tab (i18n).
     */
    attributeFormTitle: "Space Attributes",

    /** api: config[headingAttribute]
     *  ``String``
     *  Optional feature attribute name with heading information.  Values should
     *  be degrees clockwise relative to north.  If present, this value will be
     *  used to orient the camera in the street view.
     */
    headingAttribute: "ORIENTATION",

    /** api: property[feature]
     *  ``OpenLayers.Feature.Vector`` The feature being edited/displayed.
     */
    feature: null,
    
    /** api: config[schema]
     *  ``GeoExt.data.AttributeStore`` Optional. If provided, available
     *  feature attributes will be determined from the schema instead of using
     *  the attributes that the feature has currently set.
     */
    schema: null,
    
    /** api: config[readOnly]
     *  ``Boolean`` Set to true to disable editing. Default is false.
     */
    readOnly: false,
    
    /** api: config[allowDelete]
     *  ``Boolean`` Set to true to provide a Delete button for deleting the
     *  feature. Default is false.
     */
    allowDelete: false,
    
    /** api: config[editing]
     *  ``Boolean`` Set to true to open the popup in editing mode.
     *  Default is false.
     */
    
    /** private: property[editing]
     *  ``Boolean`` If we are in editing mode, this will be true.
     */
    editing: true,
    
    /** private: property[modifyControl]
     *  ``OpenLayers.Control.ModifyFeature`` If in editing mode, we will have
     *  this control for editing the geometry.
     */
    modifyControl: null,
    
    /** private: property[geometry]
     *  ``OpenLayers.Geometry`` The original geometry of the feature we are
     *  editing.
     */
    geometry: null,
    
    /** private: property[attributes]
     *  ``Object`` The original attributes of the feature we are editing.
     */
    attributes: null,
    
    /** private: property[cancelButton]
     *  ``Ext.Button``
     */
    cancelButton: null,
    
    /** private: property[saveButton]
     *  ``Ext.Button``
     */
    saveButton: null,
    
    /** private: property[editButton]
     *  ``Ext.Button``
     */
    editButton: null,
    
    /** private: property[deleteButton]
     *  ``Ext.Button``
     */
    deleteButton: null,
    
    /** private: method[initComponent]
     */
    initComponent: function() {
        this.addEvents(
            /** api: events[featuremodified]
             *  Fires when the feature associated with this popup has been
             *  modified (i.e. when the user clicks "Save" on the popup) or
             *  deleted (i.e. when the user clicks "Delete" on the popup).
             *
             *  Listener arguments:
             *  * panel - :class:`ParkingManager.OldAssetEditorPopup` This popup.
             *  * feature - ``OpenLayers.Feature`` The modified feature.
             */
            "featuremodified",
            
            /** api: events[canceledit]
             *  Fires when the user exits the editing mode by pressing the
             *  "Cancel" button or selecting "No" in the popup's close dialog.
             *  
             *  Listener arguments:
             *  * panel - :class:`ParkingManager.OldAssetEditorPopup` This popup.
             *  * feature - ``OpenLayers.Feature`` The feature. Will be null
             *    if editing of a feature that was just inserted was cancelled.
             */
            "canceledit",
            
            /** api: events[cancelclose]
             *  Fires when the user answers "Cancel" to the dialog that
             *  appears when a popup with unsaved changes is closed.
             *  
             *  Listener arguments:
             *  * panel - :class:`ParkingManager.OldAssetEditorPopup` This popup.
             */
            "cancelclose"
        );
        
        if (this.feature instanceof GeoExt.data.FeatureRecord) {
            this.feature = this.feature.getFeature();
        }
        
        var feature = this.feature;
        if (!this.location) {
            this.location = feature
        };

        if (this.schema) {
            var attributes = {};
            this.schema.each(function(r) {
                var name = r.get("name");
                var type = r.get("type");
                if (type.match(/^[^:]*:?((Multi)?(Point|Line|Polygon|Curve|Surface|Geometry))/)) {
                    // exclude gml geometries
                    return;
                }
                attributes[name] = feature.attributes[name];
            }, this);
            feature.attributes = attributes;
        }
        
        this.anchored = !this.editing;
        
        if (!this.title && feature.fid) {
            this.title = feature.fid;
        }
        
        this.editButton = new Ext.Button({
            text: this.editButtonText,
            tooltip: this.editButtonTooltip,
            iconCls: "edit",
            handler: this.startEditing,
            scope: this
        });
        
        this.deleteButton = new Ext.Button({
            text: this.deleteButtonText,
            tooltip: this.deleteButtonTooltip,
            iconCls: "delete",
            hidden: !this.allowDelete,
            handler: this.deleteFeature,
            scope: this
        });
        
        this.cancelButton = new Ext.Button({
            text: this.cancelButtonText,
            tooltip: this.cancelButtonTooltip,
            iconCls: "cancel",
            hidden: true,
            handler: function() {
                this.stopEditing(false);
            },
            scope: this
        });
        
        this.saveButton = new Ext.Button({
            text: this.saveButtonText,
            tooltip: this.saveButtonTooltip,
            iconCls: "save",
            hidden: true,
            handler: function() {
                this.stopEditing(true);
            },
            scope: this
        });
        
        this.initAttributeForm();
        
        this.items = [{
            xtype: "tabpanel",
            border: false,
            activeTab: 0,
            items: [this.attributeForm, {
                xtype: "gxp_googlestreetviewpanel",
                title: this.streetViewTitle,
                heading: this.getOrientationForFeature(feature),
                zoom: 1
            }]
        }];

        this.bbar = new Ext.Toolbar({
            hidden: this.readOnly,
            items: [
                this.editButton,
                this.deleteButton,
                this.saveButton,
                this.cancelButton
            ]
        });
        
        ParkingManager.OldAssetEditorPopup.superclass.initComponent.call(this);
        
        this.on({
            "show": function() {
                if (this.editing) {
                    this.editing = null;
                    this.startEditing();
                }
            },
            "beforeclose": function() {
                if (!this.editing) {
                    return;
                }
                if (this.feature.state === this.getDirtyState()) {
                    Ext.Msg.show({
                        title: this.closeMsgTitle,
                        msg: this.closeMsg,
                        buttons: Ext.Msg.YESNOCANCEL,
                        fn: function(button) {
                            if (button && button !== "cancel") {
                                this.stopEditing(button === "yes");
                                this.close();
                            } else {
                                this.fireEvent("cancelclose", this);
                            }
                        },
                        scope: this,
                        icon: Ext.MessageBox.QUESTION,
                        animEl: this.getEl()
                    });
                    return false;
                } else {
                    this.stopEditing(false);
                }
            },
            scope: this
        });
    },
    
    /** private: method[initAttributeForm]
     *  Generate form for editing parking space attributes.
     */
    initAttributeForm: function() {
        var attributes = this.feature.attributes;
        this.attributeForm = new Ext.FormPanel({
            monitorValid: true,
            title: this.attributeFormTitle,
            bodyStyle: "padding: 5px 5px 0",
            labelWidth: 100,
            defaults: {anchor: "98%", disabled: true},
            autoScroll: true,
            listeners: {
                clientvalidation: function(panel, valid) {
                    if (valid) {
                        this.setFeatureState(this.getDirtyState());
                    }
                },
                scope: this
            },
            items: [{
                xtype: "textfield",
                name: "POST_ID",
                fieldLabel: "Post ID",
                regex: /^\d{3}-\d{5}$/,
                regexText: "ID must be of the form 123-45678",
                value: attributes.POST_ID
            }, {
                xtype: "combo",
                name: "CAP_COLOR",
                fieldLabel: "Cap Color",
                store: ["Gray", "Orange", "Red"],
                displayField: "field1",
                valueField: "field1",
                editable: false,
                triggerAction: 'all',
                value: attributes.CAP_COLOR
            }, {
                xtype: "textfield", // use "datefield" if you want to allow editing
                name: "CREATED_DT",
                fieldLabel: "Created Date",
                readOnly: true,
                value: attributes.CREATED_DT || (new Date()).format("Y-m-d")
            }, {
                xtype: "textfield", // use "datefield" if you want to allow editing
                name: "LAST_UPD_DT",
                fieldLabel: "Modified Date",
                readOnly: true,
                value: (new Date()).format("Y-m-d")
            }, {
                xtype: "combo",
                name: "SENSOR_FLAG",
                triggerAction: "all",
                fieldLabel: "Sensor Flag",
                store: ["Y", "N"],
                displayField: "field1",
                valueField: "field1",
                editable: false,
                value: attributes.SENSOR_FLAG
            }, {
                xtype: "numberfield",
                name: "MS_SPACE_NUM",
                fieldLabel: "Space Number",
                value: attributes.MS_SPACE_NUM
            }]
        });
    },
    
    /** private: method[getOrientationForFeature]
     *  :arg feature:
     *
     *  Return the orientation of a feature based on the case insensitive
     *  `headingAttribute` property.
     */
    getOrientationForFeature: function(feature) {
        var orientation = 0;
        if (this.headingAttribute) {
            for (var attr in feature.attributes) {
                if (attr.toUpperCase() === this.headingAttribute.toUpperCase()) {
                    orientation = Number(feature.attributes[attr]);
                    break;
                }
            }
        }
        return orientation;
    },
    
    /** private: method[getDirtyState]
     *  Get the appropriate OpenLayers.State value to indicate a dirty feature.
     *  We don't cache this value because the popup may remain open through
     *  several state changes.
     */
    getDirtyState: function() {
        return this.feature.state === OpenLayers.State.INSERT ?
            this.feature.state : OpenLayers.State.UPDATE;
    },
    
    /** private: method[startEditing]
     */
    startEditing: function() {
        if (!this.editing) {
            this.attributeForm.getForm().items.each(function(){
                 this.readOnly !== true && this.enable();
            });
            this.editing = true;
            this.anc && this.unanchorPopup();

            this.editButton.hide();
            this.deleteButton.hide();
            this.saveButton.show();
            this.cancelButton.show();
            
            this.geometry = this.feature.geometry.clone();
            this.attributes = Ext.apply({}, this.feature.attributes);

            this.modifyControl = new OpenLayers.Control.ModifyFeature(
                this.feature.layer,
                {standalone: true, vertexRenderIntent: this.vertexRenderIntent}
            );
            this.feature.layer.map.addControl(this.modifyControl);
            this.modifyControl.activate();
            this.modifyControl.selectFeature(this.feature);
        }
    },
    
    /** private: method[stopEditing]
     *  :arg save: ``Boolean`` If set to true, changes will be saved and the
     *      ``featuremodified`` event will be fired.
     */
    stopEditing: function(save) {
        if (this.editing) {
            //TODO remove the line below when
            // http://trac.openlayers.org/ticket/2210 is fixed.
            this.modifyControl.deactivate();
            this.modifyControl.destroy();

            var feature = this.feature;
            
            var form = this.attributeForm.getForm();
            if (feature.state === this.getDirtyState()) {
                if (save === true) {
                    // apply modified attributes to feature
                    form.items.each(function(field) {
                        var value = field.getValue(); // this may be an empty string
                        feature.attributes[field.getName()] = value || field.value;
                    });
                    this.fireEvent("featuremodified", this, feature);
                } else if (feature.state === OpenLayers.State.INSERT) {
                    this.editing = false;
                    feature.layer.destroyFeatures([feature]);
                    this.fireEvent("canceledit", this, null);
                    this.close();
                } else {
                    form.reset();
                    var layer = feature.layer;
                    layer.drawFeature(feature, {display: "none"});
                    feature.geometry = this.geometry;
                    feature.attributes = this.attributes;
                    this.setFeatureState(null);
                    layer.drawFeature(feature);
                    this.fireEvent("canceledit", this, feature);
                }
            }

            if (!this.isDestroyed) {
                this.cancelButton.hide();
                this.saveButton.hide();
                this.editButton.show();
                this.allowDelete && this.deleteButton.show();
            }
            
            this.editing = false;
        }
    },
    
    deleteFeature: function() {
        Ext.Msg.show({
            title: this.deleteMsgTitle,
            msg: this.deleteMsg,
            buttons: Ext.Msg.YESNO,
            fn: function(button) {
                if (button === "yes") {
                    this.setFeatureState(OpenLayers.State.DELETE);
                    this.fireEvent("featuremodified", this, this.feature);
                    this.close();
                }
            },
            scope: this,
            icon: Ext.MessageBox.QUESTION,
            animEl: this.getEl()
        });
    },
    
    /** private: method[setFeatureState]
     *  Set the state of this popup's feature and trigger a featuremodified
     *  event on the feature's layer.
     */
    setFeatureState: function(state) {
        this.feature.state = state;
        var layer = this.feature.layer;
        layer && layer.events.triggerEvent("featuremodified", {
            feature: this.feature
        });
    }
});

/** api: xtype = app_oldasseteditorpopup */
Ext.reg('app_oldasseteditorpopup', ParkingManager.OldAssetEditorPopup);
