/*************************************************************************
* Helper functions
**************************************************************************/
function max_of_array(array) {
    return Math.max.apply(Math, array);
}
function max_of_nested_array(arrays) {
    return d3.max(arrays, function(array) {
        return  d3.max(array);
    });
}

// Get size of associative array
// Object.size(my_array);
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
}

function to_title_case(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function normalize_signals(all_signals, normalize_by) {
    if (normalize_by == 'person') {
        for (var key in all_signals) {      // Each e.g. person
            for (var i = 0; i < all_signals[key].length; i++) {     // Each key, e.g. person can have multiple blobs
                var max_value = max_of_array(all_signals[key][i]);
                for (var j = 0; j < all_signals[key][i].length; j++) {
                    all_signals[key][i][j] /= max_value;
                }
            }
        }
    }
    return all_signals;
}

/*************************************************************************
* MAIN FUNCTION
**************************************************************************/
var global_time_period;
var global_tweak_params;

function render_radars(data_or_path, params, tweak_default_params) {
    // Define Param variables
    var display_name, display_axes, display_metrics, display_metric_detail, display_photo;
    var tweak_mode;
    var normalize_data, normalize_by;
    read_params(params);

    function read_params(params) {
        // If key is in params, set it to value. Otherwise, default value 
        display_name = (typeof params['display_name'] === 'undefined') ? true : params['display_name'];
        display_axes = (typeof params['display_axes'] === 'undefined') ? false : params['display_axes'];
        display_metrics = (typeof params['display_metrics'] === 'undefined') ? true : params['display_metrics'];
        display_metric_detail = (typeof params['display_metric_detail'] === 'undefined') ? false : params['display_metric_detail'];
        display_photo = (typeof params['display_photo'] === 'undefined') ? false : params['display_photo'];

        tweak_mode = (typeof params['tweak_mode'] === 'undefined') ? true : params['tweak_mode'];

        normalize_data = (typeof params['normalize_data'] === 'undefined') ? true : params['normalize_data'];
        normalize_by = (typeof params['normalize_by'] === 'undefined') ? 'person' : params['normalize_by'];
    }

    // Variables for tweaks
    var fig_dim, max_svg_width;
    var tension, intermediate_pts_value;
    var color_blob_opacity, blob_color;
    add_tweaks_html(tweak_default_params);
    add_download_html();
    update_tweak_params();      // Reads tweak param variables from sliders
    if (!tweak_mode) {          // Hide or show the tweak parameters. 
        $('#tweaks').hide();
    }
    update_global_vars();

    // $(function () {
    //   $('<script>')
    //     .attr('type', 'text/javascript')
    //     .text('function get_radar_params() { return "1", {}')
    //     .appendTo('head');
    // })

    // Variables derived from tweak variables
    var svg, width, height;
    var radius, label_radius, label_fontsize, name_fontsize, label_vertical_spacing;

    // Variables to be defined and updated from data
    // Constant across figures 
    var starts = [], ends = [];               // Each list item in json has start and end for that time period
    var num_figs,
        num_signals,
        metrics = [],            // e.g. Mentions Count, Immigration
        num_time_periods = 0;           // Json can contain multiple affinity datasets per person, e.g. one for each time period
    // Varying across figures
    var all_signals = {};       // Key is name, value is list of lists

    // For multiple time periods, transitions for blobs
    var initial_time_period;   // First time drawing, transitions from initial state to initial state

    /*************************************************************************
    * READ DATA AND DRAW
    * - Listener will redraw if fig_dim or max_svg_width changes from tweak params
    **************************************************************************/
    process_and_render(data_or_path);

    function process_and_render(data_or_path) {
        if (typeof(data_or_path) === 'string') {    // Path given
            read_json_and_draw(data_or_path);
        } else {
            process_jsonobj_and_draw(data_or_path);
        }
    }

    function read_json_and_draw(path) {
        d3.json(path, function(error, data) {
            process_jsonobj_and_draw(data);
        });
    }

    // Used both when reading from json file and when given object
    function process_jsonobj_and_draw(json) {
        // Add metrics names - just get it from the first
        for (var key in json[0]['data']) {
            for (var topic in json[0]['data'][key]) {
                metrics.push(topic);
            }
            break;
        }

        for (var i = 0; i < json.length; i++) {
            starts.push(json[i]['start']);
            ends.push(json[i]['end']);
            var data = json[i]['data'];

            // Add names and signals
            for (var key in data) {
                signals = [];
                for (var topic in data[key]) {
                    signals.push(data[key][topic]);
                }
                if (!(key in all_signals)) {
                    all_signals[key] = [];
                }
                all_signals[key].push(signals);
                // Updating num_signals every time when it should always be the same
                // because selecting an element from associatave array is cumbersome
                num_signals = signals.length;
            }
        }
        num_figs = Object.size(all_signals);
        
        // Keep track of max # time periods per person so we can create html for it
        num_time_periods = json.length;
        add_blob_transition_html(num_time_periods, params['initial_time_period']);

        // Normalize data
        if (normalize_data) {   // Instead of x-min / (max-min), compute x / max
            normalize_signals(all_signals, normalize_by);
        }

        // Draw
        draw_all_figures();
    }

    function update_tweak_params() {
        tension = $('#tension').val();
        intermediate_pts_value = $('#intermediate_pts_value').val();
        color_blob_opacity = $('#color_blob_opacity').val();
        fig_dim = parseInt($('#fig_dim').val());
        max_svg_width = parseInt($('#max_svg_width').val());
        blob_color = $('#blob_color').spectrum('get').toHexString()
        $('#blob_color_hex').text(blob_color);  // Update color hex code next to picker
    }

    function add_tweaks_html(tweak_default_params) {
        add_html();
        initialize_tweak_params(tweak_default_params);
        initialize_colorpicker(tweak_default_params);
        function add_html() {
            $("#viz").prepend('<div id="tweaks" style="float:left;padding-left:50px"><label>Tweak the shape, color, size, and layout</label><br>\
                <div>\
                    <label>POINTINESS: </label>&nbsp;&nbsp;<input type="range" class="tweak local" id="tension" min="0.0" max="1.0" step="0.01" value="0.6" style="width: 100px;">\
                </div>\
                <div>\
                    <label>FULLNESS: </label>&nbsp;&nbsp;<input type="range" class="tweak local" id="intermediate_pts_value" min="0.0" max="1.0" step="0.01" value="0.6" style="width: 100px;">\
                </div>\
                <div>\
                    <label>COLOR OPACITY: </label>&nbsp;&nbsp;<input type="range" class="tweak local" id="color_blob_opacity" min="0.0" max="1.0" step="0.01" value="0.9" style="width: 100px;">\
                </div>\
                <div>\
                    <label>COLOR: </label>&nbsp;&nbsp;<input type="text" class="tweak local" id="blob_color">\
                    <label id="blob_color_hex"></label>\
                </div>\
                <div>\
                    <label>SIZE OF ONE RADAR PLOT: </label><input class="tweak global" id="fig_dim" type="text" value="250">\
                </div>\
                <div>\
                    <label>OVERALL WIDTH: <label><input class="tweak global" id="max_svg_width" type="text" value="1300">\
                </div>\
            </div><br>');
        }
        function initialize_tweak_params(tweak_default_params) {
            var params = {}
            params['tension'] = (typeof tweak_default_params['tension'] === 'undefined') ? 0.6 : tweak_default_params['tension'];
            params['intermediate_pts_value'] = (typeof tweak_default_params['intermediate_pts_value'] === 'undefined') ? 0.6 : tweak_default_params['intermediate_pts_value'];
            params['color_blob_opacity'] = (typeof tweak_default_params['color_blob_opacity'] === 'undefined') ? 0.9 : tweak_default_params['color_blob_opacity'];
            params['fig_dim'] = (typeof tweak_default_params['fig_dim'] === 'undefined') ? 250 : tweak_default_params['fig_dim'];
            params['max_svg_width'] = (typeof tweak_default_params['max_svg_width'] === 'undefined') ? 750 : tweak_default_params['max_svg_width'];

            for (var key in params) {
                $('#' + key).val(params[key]);
            }
        }

        // Input needs to be turned into spectrum colorpicker
        function initialize_colorpicker(tweak_default_params) {
            $("#blob_color").spectrum({
                color: (typeof tweak_default_params['blob_color'] === 'undefined') ? '#7CBEC6' : tweak_default_params['blob_color'],
                showInput: true,
                move: function(color) {
                    update_blob_color(color);
                    update_hex_text(color);
                    global_tweak_params['blob_color'] = color.toHexString();
                },
                change: function(color) {
                    update_blob_color(color);
                    update_hex_text(color);
                    global_tweak_params['blob_color'] = color.toHexString();
                }
            });
            function update_blob_color(color) {
                $('.blob path').css({'fill': color.toHexString()});
            }
            function update_hex_text(color) {
                $('#blob_color_hex').text(color.toHexString());
            }
        }
    }

    function add_download_html() {
         $("#viz").prepend('<div style="float:left;padding-left:50px"><label>Download: </label>\
                <button type="button" id="download">Save as PNG</button>\
            </div><br><br>');

        // Listener for download button
        $("#download").on("click", function() {
            var filename;
            if ((typeof(start) !== 'undefined') && (typeof(end) !== 'undefined')) {
                filename = start + '_to_' + end;
            } else {
                filename = 'radar.png';
            }
            saveSvgAsPng(document.getElementById("main_svg"),
                    filename,
                    {scale: 2.0});
        });
    }

    function add_blob_transition_html(num_time_periods, time_period) {
        var html = '<div id="time_periods" style="float:left;padding-left:50px">'
        for (var i = 0; i < num_time_periods; i++) {
            if (i == 0) {   // checked
                html += '<input type="radio" class="time_period" name="time_period" value="' + i + '" checked><label> Time Period: ' + starts[i] + ' to ' + ends[i] + '</label><br>';
            } else {
                html += '<input type="radio" class="time_period" name="time_period" value="' + i + '"><label> Time Period: ' + starts[i] + ' to ' + ends[i] + '</label><br>';
            }
        }
        html += '<div><br><br>'
        $("#viz").prepend(html);
        initialize_checked(time_period);

        function initialize_checked(time_period) {
            global_time_period = time_period;
            $('input[name="time_period"][value="' + time_period + '"]').prop("checked", true);
        }
    }

    /*************************************************************************
    * DRAW ALL FIGURES
    * - Listener will redraw if fig_dim or max_svg_width changes from tweak params
    **************************************************************************/
    function get_grid_offset(i) {   // Get translate offset for ith out of n figures
        var off_x = (i % (width / fig_dim)) * fig_dim;
        var off_y = Math.floor((i * fig_dim) / width) * fig_dim;
        var offset = [off_x, off_y];
        return offset;
    }

    function draw_all_figures() {
        // Width and height derived from tweak params
        width = Math.min(num_figs * fig_dim, max_svg_width - (max_svg_width % fig_dim));
        height = (Math.ceil((num_figs * fig_dim) / width)) * fig_dim;
        svg = d3.select("#viz")
            .append("svg")
            .attr('id', 'main_svg')
            .attr("width", width)
            .attr("height", height);

        // Variables derived from tweak params
        radius = fig_dim * 0.25;        
        label_radius = radius * 1.4;    
        label_fontsize = radius / 10;
        name_fontsize = radius / 5;
        label_vertical_spacing = label_fontsize * 1.5;

        // Draw individual blobs
        var kth = 0; 
        for (var key in all_signals) {
            draw_one_figure(
                all_signals[key],
                key,
                get_grid_offset(kth),
                kth);
            kth += 1;
        }
    }

    /*
    * Listener for global tweaks, i.e. ones that require redrawing of entire viz
    * These are radar plot size and overall width
    */
    // Redraw all figures if fig_dim or max_svg_width changed from input
    $('input.global').on('change', function() {
        $('#main_svg').remove();
        update_tweak_params();
        update_global_vars();
        draw_all_figures();
    })

    /*************************************************************************
    * DRAW ONE FIGURE
    * - Listener will update each figure if pointiness or fullness changes
    **************************************************************************/
    function draw_one_figure(signals, name, offset, kth) {
        /*************************************************************************
        * Variables to be defined and updated
        **************************************************************************/
        var cardinal_line;
        var blob_polygon_vertices;
        var blob_coords = [];   // list of lists
        var label_vertices; 
        var center = [fig_dim / 2, fig_dim / 2];

        /*************************************************************************
        * Group for this figure
        **************************************************************************/
        var fig_svg = svg.append('g')
            .attr('id', 'fig_' + kth)
            .attr('class', 'fig')
            .attr("transform", "translate(" + offset[0] + "," + offset[1] + ")");

        /*************************************************************************
        * GET VERTICES OF REGULAR POLYGON WITH RADIUS 
        **************************************************************************/
        function get_polygon_vertices(n, radius) {
            var vertices = [];
            for (var i = 0; i < n; i += 1) {
                var pt = [center[0] + radius * Math.cos(-Math.PI/2 + (i * 2 * Math.PI / n)),
                center[1] + radius * Math.sin(-Math.PI/2 + (i * 2 * Math.PI / n))];
                vertices.push(pt);
            }
            return vertices;
        }
        label_vertices = get_polygon_vertices(num_signals, label_radius);
        blob_polygon_vertices = get_polygon_vertices(num_signals*2, radius); // n*2 for intermediate pts

        /************************************************************************
        * DRAW BACKGROUND CIRCLES
        **************************************************************************/
        var circle_opacity = 0.03;
        var circle_color = '000000'
        var small_c_radius = 0.5 * radius;
        var small_c = fig_svg.append('g')
            .attr('id', 'backgroundCs')
            .attr('transform', function() {
                var start_x = center[0] - small_c_radius;
                var start_y = center[1] - small_c_radius;
                return 'translate(' + start_x + ',' + start_y + ')';});
        small_c
            .append('circle')
            .attr('cx', small_c_radius)
            .attr('cy', small_c_radius)
            .attr('r', small_c_radius)
            // .attr("stroke", "#193366")
            // .attr("stroke-width", 1)
            .attr('fill', circle_color)
            .attr('opacity', circle_opacity);
        fig_svg
            .append('circle')
            .attr('cx', center[0])
            .attr('cy', center[1])
            .attr('r', 0.75 * radius)
            // .attr("stroke", "#193366")
            // .attr("stroke-width", 1)
            .attr('fill', circle_color)
            .attr('opacity', circle_opacity);
        fig_svg
            .append('circle')
            .attr('cx', center[0])
            .attr('cy', center[1])
            .attr('r', radius)
            // .attr("stroke", "#193366")
            // .attr("stroke-width", 1)
            .attr('fill', circle_color)
            .attr('opacity', circle_opacity);

        /*************************************************************************
        * DRAW BLOBS
        **************************************************************************/
        // Line used to make closed loop for blob
        function define_cardinal_line(tension) {
            cardinal_line = d3.svg.line()
            .x(function(d) { return d[0]; })
            .y(function(d) { return d[1]; })
            .interpolate("cardinal-closed")
            .tension(tension);
        }
        define_cardinal_line(tension);

        // Get blobs vertices using vertices of regular polygon
        // blob_polygon_vertices has n*2 sides for the intermediate points of the blob
        function get_blob_coords(center, vertices, signals) {
            var coords = [];
            for(var i=0; i<vertices.length; i++) {
                var x, y;
                if (i % 2 == 0) { // Actual vertex
                    x = center[0] + signals[i/2] * (vertices[i][0] - center[0]);
                    y = center[1] + signals[i/2] * (vertices[i][1] - center[1]);
                } else {        // Intermediate vertex
                    // If metric value is small, dont' want large intermediate ctrl pts to artifically make blob bigger
                    var prev_signals_idx = Math.round((i-1)/2); //
                    var next_signals_idx = Math.round((i+1)/2 % signals.length);
                    var a = signals[prev_signals_idx];
                    var b = signals[next_signals_idx];
                    var theta = 360 / signals.length * Math.PI / 180; // Rad
                    // Law of cosines to find length of segment connecting neighboring points
                    var c = Math.sqrt(a*a + b*b - 2*a*b*Math.cos(theta))
                    // Length of angle bisector
                    // Formula: https://proofwiki.org/wiki/Length_of_Angle_Bisector
                    var d = Math.sqrt((a*b)/((a+b)*(a+b)) * ((a+b)*(a+b) - c*c));
                    var scale = Math.min(
                        d,
                        $('#intermediate_pts_value').val());
                    x = center[0] + scale * (vertices[i][0] - center[0]);
                    y = center[1] + scale * (vertices[i][1] - center[1]);
                }
                coords.push([x,y])
            }
            return coords;
        };
        for (var i = 0; i < signals.length; i++) {
            blob_coords.push(get_blob_coords(center, blob_polygon_vertices, signals[i], intermediate_pts_value));
        }

        function draw_img_blob() {
            // TODO: better img_pad_ratio. Point is for max value to not outermost circle
            var img_pad_ratio = Math.min(1.0, 1.1*Math.max(...signals));
            var new_time_period = $('input[name=time_period]:checked').val();
            var img_blob = fig_svg
                .append('g')
                .attr('class', 'blob');

            img_blob.insert('svg:defs', ":first-child")
                .insert('clipPath')
                .attr("id", "pic")
                .append('path')
                .attr("d", cardinal_line(blob_coords[new_time_period]))
                .attr("stroke", "#0065cc")
                .attr("stroke-width", 2);

            img_blob.insert('svg:defs', ":first-child")
                .insert('filter')
                .attr("id", "saturate")
                .append('feColorMatrix')
                .attr("in", "SourceGraphic")
                .attr("type", "saturate")
                .attr("values", ".0");

            img_blob.append('image')
                .attr('xlink:href', 'imgs/' + name + '.jpg')
                .attr('x', center[0] - img_pad_ratio*radius)
                .attr('y', center[1] - img_pad_ratio*radius)
                .attr('height', 2*img_pad_ratio*radius)
                .attr('width',  2*img_pad_ratio*radius)
                .attr('opacity', 0.4)
                .attr('filter', 'url(#saturate)')
                .attr('clip-path', 'url(#pic)');
        }
        if (display_photo) {
            draw_img_blob();
        }
        
        // DRAW COLOR BLOB.
        var prev_checked_time_period = global_time_period;
        function draw_color_blob() {
            var new_time_period = $('input[name=time_period]:checked').val();
            var color_blob = fig_svg
                .append('g')
                .attr('class', 'blob')
                // .attr("stroke-width", 2)
                .attr('opacity', color_blob_opacity)
                .attr('fill', blob_color)

            color_blob
                .append('path')
                .attr('d', cardinal_line(blob_coords[prev_checked_time_period]))
                .transition().delay(0).duration(2500)
                .attr('d', cardinal_line(blob_coords[new_time_period]));
            prev_checked_time_period = new_time_period;
        }
        draw_color_blob();

        /************************************************************************
        * ADD FINAL SCORE TO MIDDLE OF BLOB
        **************************************************************************/
        if (typeof final_score !== 'undefined') {
            small_c.append('g')
                .append('id', 'score')
                .append('text')
                .attr('x', small_c_radius)
                .attr('y', small_c_radius + 20)  // TODO: center automatically..
                .text(final_score)
                .attr('font-family', 'Helvetica, sans-serif')
                .attr('font-size', name_fontsize)
                .attr('opacity', 1.0)
                // .attr('opacity', 0.0)
                .attr('font-weight', 900)
                .style('fill', 'black')
                .attr('text-anchor', 'middle');
        }

        /************************************************************************
        * DRAW AXIS LINES
        **************************************************************************/
        if (display_axes) {
            var ga = fig_svg
                .append("g")
                .attr('id', 'axes')
                .attr("transform", "translate(" + center[0] + "," + center[1] + ")")
                .append('g')
                .attr("class", "a axis")
                .selectAll("g")
                .data(d3.range(90 - 360/num_signals, 360, 360/num_signals))
                .enter().append("g")
                .attr("transform", function(d) { return "rotate(" + -d + ")"; })
                .append("line")
                .attr('x1', 0)
                .attr("x2", radius)
                .attr("stroke", "#193366")
                .attr("stroke-width", 1)
                .attr('opacity', 0.1);
        }

        /************************************************************************
        * ADD LABELS FOR EACH AXIS
        **************************************************************************/
        if (display_metrics) {
            labels = fig_svg
                .append('g')
                .attr('class', 'axisLabels')
                .selectAll('text')
                .data(metrics)
                .enter()
                .append('g')
                .attr('class', 'axisLabel')
                .append('text')
                .attr('x', function(d, i) {return label_vertices[i][0]; })
                .attr('y', function(d, i) {return label_vertices[i][1]; })
                .text(function(d,i) {return d.toUpperCase(); })
                .attr('font-family', 'Helvetica Neue, Helvetica, sans-serif')
                .attr('font-size', label_fontsize)
                .attr('opacity', 0.5)
                .attr('font-weight', 500)
                .attr('letter-spacing', '1px')
                .attr('text-anchor', 'middle');
              
            // Break multi-word labels across lines.
            // To force words to stay on the same line, insert non-breaking space into CSV.
            function insert_line_breaks(d, i) {
                var el = d3.select(this);
                var words = d.split(' ');
                el.text('');
                for (var j = 0; j < words.length; j++) {
                    var tspan = el.append('tspan').text(words[j].toUpperCase());
                    if (j > 0)
                        tspan.attr('x', label_vertices[i][0])
                            .attr('dy', label_vertical_spacing);
                }
            };
            fig_svg.selectAll('.axisLabel text').each(insert_line_breaks);
        }

         /************************************************************************
         * ADD METRIC DETAILS 
         **************************************************************************/
        if (display_metrics && typeof metric_details !== 'undefined') {
            label_details = fig_svg
              .append('g')
              .attr('id', 'axisLabelDetails')
              .selectAll('text')
              .data(metric_details)
              .enter()
              .append('g')
              .attr('class', 'axisLabelDetail')
              .append('text')
              .attr('x', function(d, i) {return label_vertices[i][0]; })
              .attr('y', function(d, i) {return label_vertices[i][1] + 32; }) // TODO: matters when label is 2 words vs 1
              .text(function(d,i) {return d; })
              .attr('font-family', 'Helvetica Neue, Helvetica, sans-serif')
              .attr('font-size', label_fontsize)
              .attr('opacity', 0.5)
              .attr('font-weight', 500)
              .attr('text-anchor', 'middle');
        }
         
        /************************************************************************
        * ADD NAME TO BOTTOM OF FIGURE
        **************************************************************************/
        if (display_name) {
            fig_svg.append('g')
                .attr('id', 'name')
                .append('text')
                .attr('x', center[0])
                .attr('y', center[1] + 1.3 * label_radius) // TODO: auto placement?
                // .text(name + ' (' + final_score + ')')
                .text(to_title_case(name))
                .attr('font-family', 'Helvetica Neue, Helvetica, sans-serif')
                .attr('font-size', name_fontsize)
                .attr('opacity', 0.7)
                .attr('font-weight', 400) // 400 is normal. 700 is bold.
                .attr('letter-spacing', '0px')
                .attr('text-anchor', 'middle');
        }

        /************************************************************************
        * REDRAW BLOBS WHEN pointiness or fullness slider changes
        * TODO: Update shapes without fully redrawing? Having trouble with tension.
        **************************************************************************/
        $('input.local').on('input', function() {
            redraw_blob(kth);
        });

        // Listener for time period toggle
        $('#time_periods').on('change', function() {
            redraw_blob(kth);
        });

        function redraw_blob(kth) {
            update_global_vars();

            update_tweak_params();

            $('#fig_' + kth + ' .blob').remove();

            define_cardinal_line(tension);            // In case tension changed

            // Redefine blob coordinates
            blob_coords = [];
            for (var i = 0; i < signals.length; i++) {
                blob_coords.push(get_blob_coords(center, blob_polygon_vertices, signals[i], intermediate_pts_value));
            }

            // Display blobs
            if (display_photo) {
                draw_img_blob();
            }
            draw_color_blob();
        }
    }

    // Global vars are used to keep state, used especially for dashboard
    function update_global_vars() {
        global_time_period = $('input[name=time_period]:checked').val();

        global_tweak_params = {};
        global_tweak_params['tension'] = $('#tension').val();
        global_tweak_params['intermediate_pts_value'] = $('#intermediate_pts_value').val();
        global_tweak_params['color_blob_opacity'] = $('#color_blob_opacity').val();
        global_tweak_params['fig_dim'] = parseInt($('#fig_dim').val());
        global_tweak_params['max_svg_width'] = parseInt($('#max_svg_width').val());
        global_tweak_params['blob_color'] = $('#blob_color').spectrum('get').toHexString();
    }

}
