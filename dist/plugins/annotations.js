/*
taucharts@2.0.0-beta.35 (2018-01-11)
Copyright 2018 Targetprocess, Inc.
Licensed under Apache License 2.0
*/
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('taucharts'), require('d3-color')) :
	typeof define === 'function' && define.amd ? define(['taucharts', 'd3-color'], factory) :
	(global.Taucharts = global.Taucharts || {}, global.Taucharts.Annotations = factory(global.Taucharts,global.d3));
}(this, (function (Taucharts,d3) { 'use strict';

Taucharts = Taucharts && Taucharts.hasOwnProperty('default') ? Taucharts['default'] : Taucharts;

var utils = Taucharts.api.utils;
var pluginsSDK = Taucharts.api.pluginsSDK;
var addToUnits = function (units, newUnit, position) {
    if (position === 'front') {
        units.push(newUnit);
    }
    else {
        // behind by default
        units.unshift(newUnit);
    }
};
var stretchByOrdinalAxis = function (noteItem) {
    return function (model) {
        var res = {};
        var seed = [
            {
                dim: model.scaleX.dim,
                scale: model.scaleY,
                method: 'yi',
                k: -1
            },
            {
                dim: model.scaleY.dim,
                scale: model.scaleX,
                method: 'xi',
                k: 1
            },
            {
                dim: null,
                scale: null,
                method: null,
                k: null
            }
        ].find(function (a) {
            if (Array.isArray(noteItem.dim)) {
                return noteItem.dim.indexOf(a.dim) >= 0;
            }
            return a.dim === noteItem.dim;
        });
        if (seed.method === null) {
            return res;
        }
        var marker = '__pos__';
        var kAxis = seed.k;
        var koeff = { l: -0.5, r: 0.5 };
        var method = seed.method;
        var scale = seed.scale;
        res[method] = (function (row) {
            var k = (koeff[row[marker]] || 0) * kAxis;
            if (scale.discrete) {
                return (model[method](row) + scale.stepSize(row[scale.dim]) * k);
            }
            if (scale.period) {
                var gen = Taucharts.api.tickPeriod.get(scale.period, { utc: scale.utcTime });
                var domain = scale.domain();
                var min = gen.cast(domain[0]);
                while (min < domain[0]) {
                    min = gen.next(min);
                }
                var max = gen.cast(domain[1]);
                var k_1 = ((scale(max) - scale(min)) / (max - min));
                switch (row[marker]) {
                    case 'l': {
                        var overflow = Math.min(0, domain[0] - min);
                        return (scale(min) + k_1 * overflow);
                    }
                    case 'r': {
                        var overflow = Math.max(0, domain[1] - max);
                        return (scale(max) + k_1 * overflow);
                    }
                }
            }
            return model[method](row);
        });
        return res;
    };
};
function annotations(xSettings) {
    var settings = utils.defaults(xSettings || {}, {
        items: [],
        showValue: false,
        formatters: {},
    });
    var textScaleName = 'annotation_text';
    return {
        init: function (chart) {
            var _this = this;
            this._chart = chart;
            var specRef = chart.getSpec();
            specRef.scales[textScaleName] = { type: 'value', dim: 'text', source: '?' };
            specRef.transformations = specRef.transformations || {};
            var log = function (msg) { return specRef.settings.log(msg, 'LOG'); };
            // NOTE: We need to save rows references to let
            // annotations properly animate during filtering.
            this._dataRefs = {};
            specRef.transformations.dataRange = function (data, metaInfo) {
                var from = metaInfo.from;
                var to = metaInfo.to;
                var primaryScaleInfo = chart.getScaleInfo(metaInfo.primaryScale);
                if ((primaryScaleInfo.period)) {
                    var periodCaster = Taucharts.api.tickPeriod.get(primaryScaleInfo.period, { utc: specRef.settings.utcTime });
                    from = periodCaster.cast(new Date(metaInfo.from));
                    to = periodCaster.cast(new Date(metaInfo.to));
                }
                var isX0OutOfDomain = !primaryScaleInfo.isInDomain(from);
                var isX1OutOfDomain = !primaryScaleInfo.isInDomain(to);
                var isOutOfDomain = (primaryScaleInfo.discrete ?
                    (isX0OutOfDomain || isX1OutOfDomain) :
                    (isX0OutOfDomain && isX1OutOfDomain));
                if (isOutOfDomain) {
                    log('Annotation is out of domain');
                    return [];
                }
                var secondaryScaleInfo = chart.getScaleInfo(metaInfo.secondaryScale);
                var secDomain = secondaryScaleInfo.domain();
                var boundaries = [secDomain[0], secDomain[secDomain.length - 1]];
                var a = primaryScaleInfo.dim;
                var b = secondaryScaleInfo.dim;
                var z = '__pos__';
                var leftBtm = {};
                var leftTop = {};
                var rghtTop = {};
                var rghtBtm = {};
                leftBtm[z] = 'l';
                leftBtm[a] = from;
                leftBtm[b] = boundaries[0];
                leftTop[z] = 'l';
                leftTop[a] = to;
                leftTop[b] = boundaries[0];
                rghtTop[z] = 'r';
                rghtTop[a] = to;
                rghtTop[b] = boundaries[1];
                rghtBtm[z] = 'r';
                rghtBtm[a] = from;
                rghtBtm[b] = boundaries[1];
                ((metaInfo.axis === 'y') ? rghtTop : rghtBtm).text = metaInfo.text;
                return _this._useSavedDataRefs([leftBtm, leftTop, rghtTop, rghtBtm], String([a, from, to]));
            };
            specRef.transformations.dataLimit = function (data, metaInfo) {
                var primary = metaInfo.primaryScale;
                var secondary = metaInfo.secondaryScale;
                var primaryScaleInfo = chart.getScaleInfo(primary);
                var from = ((primaryScaleInfo.period) ?
                    Taucharts.api.tickPeriod.get(primaryScaleInfo.period, { utc: specRef.settings.utcTime })
                        .cast(new Date(metaInfo.from)) :
                    metaInfo.from);
                var isOutOfDomain = (!primaryScaleInfo.isInDomain(from));
                if (isOutOfDomain) {
                    log('Annotation is out of domain');
                    return [];
                }
                var secondaryScaleInfo = chart.getScaleInfo(secondary);
                var secDomain = secondaryScaleInfo.domain();
                var boundaries = [secDomain[0], secDomain[secDomain.length - 1]];
                var src = {};
                var dst = {};
                var a = primaryScaleInfo.dim;
                var b = secondaryScaleInfo.dim;
                var z = '__pos__';
                src[a] = from;
                src[b] = boundaries[0];
                src[z] = 'l';
                if (settings.showValue) {
                    var format = _this._getFormat(a);
                    src.text = format(from);
                }
                dst[a] = from;
                dst[b] = boundaries[1];
                dst[z] = 'r';
                dst.text = metaInfo.text;
                return _this._useSavedDataRefs([src, dst], String(from));
            };
            specRef.transformations.lineNoteData = function (data, metaInfo) {
                var xScaleId = metaInfo.xScale;
                var yScaleId = metaInfo.yScale;
                var xScale = chart.getScaleInfo(xScaleId);
                var yScale = chart.getScaleInfo(yScaleId);
                var xPeriod = (xScale.period ?
                    Taucharts.api.tickPeriod.get(xScale.period, { utc: xScale.utcTime }) :
                    null);
                var yPeriod = (yScale.period ?
                    Taucharts.api.tickPeriod.get(yScale.period, { utc: yScale.utcTime }) :
                    null);
                var points = metaInfo.points.map(function (d) {
                    return [
                        xPeriod ? xPeriod.cast(d[0]) : d[0],
                        yPeriod ? yPeriod.cast(d[1]) : d[1]
                    ];
                });
                if (points.some(function (d) { return !xScale.isInDomain(d[0]) || !yScale.isInDomain(d[1]); })) {
                    log('Annotation is out of domain');
                    return [];
                }
                var xDim = xScale.dim;
                var yDim = yScale.dim;
                var linePoints = points.map(function (d, i) {
                    return _a = {}, _a[xDim] = d[0], _a[yDim] = d[1], _a.text = ((settings.showValue && i === 0)
                            ? _this._getFormat(yDim)(d[1])
                            : metaInfo.text), _a;
                    var _a;
                });
                return _this._useSavedDataRefs(linePoints, JSON.stringify([xDim, yDim, metaInfo.points]));
            };
        },
        addAreaNote: function (specRef, coordsUnit, noteItem) {
            var log = function (msg) { return specRef.settings.log(msg, 'LOG'); };
            var xScale = specRef.scales[coordsUnit.x];
            var yScale = specRef.scales[coordsUnit.y];
            var axes = ((noteItem.dim === xScale.dim) ?
                ['x', 'y'] :
                ((noteItem.dim === yScale.dim) ?
                    ['y', 'x'] :
                    (null)));
            if (axes === null) {
                log('Annotation doesn\'t match any data field');
                return;
            }
            var from = noteItem.val[0];
            var to = noteItem.val[1];
            var annotatedArea = {
                type: 'ELEMENT.PATH',
                namespace: 'annotations',
                x: coordsUnit.x,
                y: coordsUnit.y,
                color: noteItem.colorScaleName,
                label: textScaleName,
                expression: {
                    inherit: false,
                    operator: 'none',
                    params: [],
                    source: '/'
                },
                transformModel: [stretchByOrdinalAxis(noteItem)],
                transformation: [
                    {
                        type: 'dataRange',
                        args: {
                            axis: axes[0],
                            text: noteItem.text,
                            from: from,
                            to: to,
                            primaryScale: coordsUnit[axes[0]],
                            secondaryScale: coordsUnit[axes[1]]
                        }
                    }
                ],
                guide: {
                    animationSpeed: coordsUnit.guide.animationSpeed,
                    showAnchors: 'never',
                    cssClass: 'tau-chart__annotation-area',
                    label: {
                        fontColor: noteItem.color,
                        position: ['r', 'b', 'keep-in-box']
                    }
                }
            };
            addToUnits(coordsUnit.units, annotatedArea, noteItem.position);
        },
        addLineNote: function (specRef, coordsUnit, noteItem) {
            var log = function (msg) { return specRef.settings.log(msg, 'LOG'); };
            var xScale = specRef.scales[coordsUnit.x];
            var yScale = specRef.scales[coordsUnit.y];
            var axes = null;
            var isAxisNote = true;
            var dims;
            if (Array.isArray(noteItem.dim)) {
                isAxisNote = false;
                dims = noteItem.dim;
                if ((dims[0] === xScale.dim && dims[1] === yScale.dim) ||
                    (dims[0] === yScale.dim && dims[1] === xScale.dim)) {
                    axes = ['x', 'y'];
                }
            }
            else {
                if (noteItem.dim === xScale.dim) {
                    axes = ['x', 'y'];
                }
                else if (noteItem.dim === yScale.dim) {
                    axes = ['y', 'x'];
                }
            }
            if (axes === null) {
                log('Annotation doesn\'t match any field');
                return;
            }
            var text = noteItem.text;
            var annotatedLine = {
                type: 'ELEMENT.LINE',
                namespace: 'annotations',
                x: coordsUnit.x,
                y: coordsUnit.y,
                label: textScaleName,
                color: noteItem.colorScaleName,
                expression: {
                    inherit: false,
                    operator: 'none',
                    params: [],
                    source: '/'
                },
                guide: {
                    animationSpeed: coordsUnit.guide.animationSpeed,
                    showAnchors: 'never',
                    widthCssClass: 'tau-chart__line-width-2',
                    cssClass: 'tau-chart__annotation-line',
                    label: {
                        fontColor: noteItem.color,
                        position: (isAxisNote ?
                            ['r', 'b', 'keep-in-box'] :
                            [
                                'auto:avoid-label-edges-overlap',
                                'auto:adjust-on-label-overflow',
                                'keep-in-box'
                            ])
                    },
                    x: {
                        fillGaps: false
                    },
                    y: {
                        fillGaps: false
                    }
                }
            };
            var extension = (isAxisNote ?
                {
                    transformModel: [stretchByOrdinalAxis(noteItem)],
                    transformation: [
                        {
                            type: 'dataLimit',
                            args: {
                                from: noteItem.val,
                                text: text,
                                primaryScale: coordsUnit[axes[0]],
                                secondaryScale: coordsUnit[axes[1]]
                            }
                        }
                    ],
                } :
                (function () {
                    var points = (dims[0] === xScale.dim ?
                        noteItem.val :
                        noteItem.val.map(function (d) { return d.slice().reverse(); }));
                    return {
                        transformation: [
                            {
                                type: 'lineNoteData',
                                args: {
                                    points: points,
                                    text: text,
                                    xScale: coordsUnit.x,
                                    yScale: coordsUnit.y
                                }
                            }
                        ]
                    };
                })());
            Object.assign(annotatedLine, extension);
            addToUnits(coordsUnit.units, annotatedLine, noteItem.position);
        },
        onUnitsStructureExpanded: function () {
            var chart = this._chart;
            var specRef = chart.getSpec();
            var data = chart.getDataSources()['/'].data;
            var annotatedValues = this._getAnnotatedDimValues(settings.items);
            var annotatedDims = Object.keys(annotatedValues);
            annotatedDims.forEach(function (dim) {
                var xScaleId = "x_" + dim;
                var yScaleId = "y_" + dim;
                [xScaleId, yScaleId].forEach(function (scaleId) {
                    if (scaleId in specRef.scales) {
                        var config = specRef.scales[scaleId];
                        var originalValues = data.map(function (row) { return row[dim]; });
                        var isTimeScale = (['period', 'time'].indexOf(config.type) >= 0);
                        var convertedAnnotations = (isTimeScale
                            ? annotatedValues[dim].map(function (x) { return new Date(x); })
                            : annotatedValues[dim]);
                        config.series = utils.unique(originalValues.concat(convertedAnnotations));
                    }
                });
            });
            this._startWatchingDataRefs();
        },
        onRender: function () {
            this._clearUnusedDataRefs();
        },
        onSpecReady: function (chart, specRef) {
            var self = this;
            var units = [];
            chart.traverseSpec(specRef, function (unit) {
                if (unit && (unit.type === 'COORDS.RECT') && (unit.units)) {
                    units.push(unit);
                }
            });
            this._formatters = pluginsSDK.getFieldFormatters(specRef, settings.formatters);
            var log = function (msg) { return specRef.settings.log(msg, 'LOG'); };
            var specApi = pluginsSDK.spec(specRef);
            units.forEach(function (coordsUnit) {
                settings.items
                    .map(function (item, i) {
                    var color = (item.color || '#BD10E0').toLowerCase();
                    var rgbCode = d3.rgb(color).toString();
                    if ((color !== 'black') && (rgbCode === 'rgb(0, 0, 0)')) {
                        rgbCode = null;
                    }
                    var colorStr = rgbCode || color;
                    var colorScaleName = 'annotation_color_' + i;
                    specApi.addScale(colorScaleName, {
                        type: 'color',
                        source: '?',
                        brewer: [colorStr]
                    });
                    return {
                        dim: item.dim,
                        val: item.val,
                        text: item.text,
                        color: colorStr,
                        position: item.position,
                        colorScaleName: colorScaleName
                    };
                })
                    .forEach(function (item) {
                    if (Array.isArray(item.dim)) {
                        if (Array.isArray(item.val) && item.val.every(Array.isArray)) {
                            self.addLineNote(specRef, coordsUnit, item);
                        }
                        else {
                            // Todo: point annotation.
                            // self.addPointNote(specRef, coordsUnit, item);
                            log('Point annotation is not implemented yet');
                        }
                    }
                    else if (Array.isArray(item.val)) {
                        self.addAreaNote(specRef, coordsUnit, item);
                    }
                    else {
                        self.addLineNote(specRef, coordsUnit, item);
                    }
                });
            });
        },
        _getFormat: function (dim) {
            return (this._formatters[dim] ?
                this._formatters[dim].format :
                function (x) { return String(x); });
        },
        _useSavedDataRefs: function (rows, key) {
            var refs = this._dataRefs;
            var usedKeys = this._usedDataRefsKeys;
            usedKeys.add(key);
            if (key in refs) {
                refs[key].forEach(function (ref, i) { return Object.assign(ref, rows[i]); });
                return refs[key];
            }
            refs[key] = rows;
            return rows;
        },
        _startWatchingDataRefs: function () {
            var refs = this._dataRefs;
            this._initialDataRefsKeys = new Set(Object.keys(refs));
            this._usedDataRefsKeys = new Set();
        },
        _clearUnusedDataRefs: function () {
            var refs = this._dataRefs;
            var initialKeys = this._initialDataRefsKeys;
            var usedKeys = this._usedDataRefsKeys;
            Array.from(initialKeys)
                .filter(function (key) { return !usedKeys.has(key); })
                .forEach(function (key) { return delete refs[key]; });
            this._initialDataRefsKeys = null;
            this._usedDataRefsKeys = null;
        },
        _getDataRowsFromItems: function (items) {
            var createRow = function (dims, vals) {
                return dims.reduce(function (row, dim, i) {
                    row[dim] = vals[i];
                    return row;
                }, {});
            };
            return items.reduce(function (rows, item) {
                if (Array.isArray(item.dim)) {
                    if (Array.isArray(item.val) && item.val.every(Array.isArray)) {
                        item.val.forEach(function (v) {
                            rows.push(createRow(item.dim, v));
                        });
                    }
                    else {
                        // Todo: point annotation.
                    }
                }
                else if (Array.isArray(item.val)) {
                    item.val.forEach(function (v) {
                        rows.push(createRow([item.dim], [v]));
                    });
                }
                else {
                    rows.push(createRow([item.dim], [item.val]));
                }
                return rows;
            }, []);
        },
        _getAnnotatedDimValues: function (items) {
            var rows = this._getDataRowsFromItems(items);
            var values = {};
            rows.forEach(function (row) {
                Object.keys(row).forEach(function (dim) {
                    values[dim] = values[dim] || [];
                    values[dim].push(row[dim]);
                });
            });
            return values;
        },
    };
}
Taucharts.api.plugins.add('annotations', annotations);

return annotations;

})));
