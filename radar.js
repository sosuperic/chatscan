
/************************************************************************

* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

* * * * * * * * * * * * * DRAWING FIGURES * * * * * * * * * * * * * * * * 

* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

************************************************************************/




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

function normalize_signals(all_signals, num_figs, normalize_by) {
    if (normalize_by == 'person') {
        for (var i = 0; i < num_figs; i++) {
            var max_value = max_of_array(all_signals[i]);
            for (var j = 0; j < all_signals[i].length; j++) {
                all_signals[i][j] /= max_value;
            }
        }
    } else if (normalize_by == 'all') {
        var max_value = max_of_nested_array(all_signals);
        for (var i = 0; i < num_figs; i++) {
            for (var j = 0; j < all_signals[i].length; j++) {
                all_signals[i][j] /= max_value;
            }
        }
    }
    return all_signals;
}

/*************************************************************************
* MAIN FUNCTION
**************************************************************************/
function render_radars(data_or_path, tweak_mode) {
    // Html elements for tweaks. This goes before the #viz div
    add_tweaks_html();
    initialize_colorpicker();

    // Hide or show the tweak parameters. Note that the defaults are set in add_tweaks_html
    if (!tweak_mode) {
        $('#tweaks').hide();
    }

    // Variables from tweaks
    var fig_dim, max_svg_width;
    var tension, intermediate_pts_value;
    var color_blob_opacity, blob_color;
    update_tweak_params();          // Reads tweak params from sliders

    // Variables derived from tweak variables
    var svg, width, height;
    var radius, label_radius, label_fontsize, name_fontsize, label_vertical_spacing;

    // Variables to be defined and updated from data
    // Constant across figures 
    var start, end;                 // This is only present in JSON/js obj
    var num_figs,
        num_signals,
        metrics = [];               // e.g. Mentions Count, Immigration
    // Varying across figures
    var all_signals = [],
        all_names  = [];

    /*************************************************************************
    * READ DATA AND DRAW
    * - Listener will redraw if fig_dim or max_svg_width changes from tweak params
    **************************************************************************/
    process_and_render(data_or_path);

    function process_and_render(data_or_path) {
        if (typeof(data_or_path) === 'string') {    // Path given
            if (data_or_path.endsWith('csv')) {
                read_csv_and_draw(data_or_path);
            } else if (data_or_path.endsWith('json')) {
                read_json_and_draw(data_or_path);
            }
        } else {
            process_jsonobj_and_draw(data_or_path);
        }
    }

    function read_csv_and_draw(path) {
        d3.csv(path, function(data) {
            // Set width and height of svg using num_figs
            // Width is either a) width of figs, e.g. max_svg_width = 1400, 1 fig of fig_dim 500
            // or b) filled in as wide as possible (after which it wraps to next row)
            num_figs = data.length;
            // Add metrics
            for (var key in data[0]) {  // Add metrics
                if (key != 'Name') {
                    metrics.push(key);
                }
            }

            // Add name and signals
            for (var i = 0; i < num_figs; i++) {
                signals = [];

                for (var key in data[i]) {  // Add name and signals
                    if (key == 'Name') {
                        all_names.push(data[i][key]);
                    } else {
                        signals.push(parseFloat(data[i][key]));
                    }
                }
                all_signals.push(signals);
            }
            num_signals = signals.length;

            // Normalize data
            if (NORMALIZE_DATA) {   // Instead of x-min / (max-min), compute x / max
                normalize_signals(all_signals, num_figs, NORMALIZE_BY);
            }

            // Draw
            draw_all_figures();
        });            
    }

    function read_json_and_draw(path) {
        d3.json(path, function(error, data) {
            process_jsonobj_and_draw(data);
        });
    }

    // Used both when reading from json file and when given object
    function process_jsonobj_and_draw(data) {
        start = data['start'];
        end = data['end'];
        var data = data['data'];
        num_figs = Object.size(data);
        
        // Add metrics names - just get it from the first 
        for (var key in data) {
            for (var topic in data[key]) {
                metrics.push(topic);
            }
            break;
        }

        // Add names and signals
        for (var key in data) {
            signals = [];
            all_names.push(to_title_case(key));
            for (var topic in data[key]) {
                signals.push(data[key][topic]);
            }
            all_signals.push(signals);
        }
        num_signals = all_signals[0].length;

        // Normalize data
        if (NORMALIZE_DATA) {   // Instead of x-min / (max-min), compute x / max
            normalize_signals(all_signals, num_figs, NORMALIZE_BY);
        }

        // Draw
        draw_all_figures();
    }

    function update_tweak_params() {
        tension = $('#tension_slider').val();
        intermediate_pts_value = $('#intermediate_pts_slider').val();
        color_blob_opacity = $('#color_blob_opacity').val();
        fig_dim = parseInt($('#fig_dim').val());
        max_svg_width = parseInt($('#max_svg_width').val());
        blob_color = $('#blob_color').spectrum('get').toHexString()
        $('#blob_color_hex').text(blob_color);  // Update color hex code next to picker
    }

    function add_tweaks_html() {
        $("#viz").before('<div id="tweaks">\
            <div>\
                POINTINESS: &nbsp;&nbsp;<input type="range" class="tweak local" id="tension_slider" min="0.0" max="1.0" step="0.01" value="0.6" style="width: 100px;">\
            </div>\
            <div>\
                FULLNESS: &nbsp;&nbsp;<input type="range" class="tweak local" id="intermediate_pts_slider" min="0.0" max="1.0" step="0.01" value="0.6" style="width: 100px;">\
            </div>\
            <div>\
                COLOR OPACITY: &nbsp;&nbsp;<input type="range" class="tweak local" id="color_blob_opacity" min="0.0" max="1.0" step="0.01" value="0.9" style="width: 100px;">\
            </div>\
            <div>\
                COLOR: &nbsp;&nbsp;<input type="text" class="tweak local" id="blob_color">\
                <label id="blob_color_hex"></label>\
            </div>\
            <div>\
                SIZE OF ONE RADAR PLOT: <input class="tweak global" id="fig_dim" type="text" value="250">\
            </div>\
            <div>\
                OVERALL WIDTH: <input class="tweak global" id="max_svg_width" type="text" value="1300">\
            </div>\
        </div><br>\
        <div>\
            <button type="button" id="download">Save as PNG</button>\
        </div>');

        /*************************************************************************
        * Listener for download button
        **************************************************************************/
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

    // Input needs to be turned into spectrum colorpicker
    function initialize_colorpicker() {
        $("#blob_color").spectrum({
            color: '#7CBEC6',
            showInput: true,
            move: function(color) {
                update_blob_color(color);
                update_hex_text(color);
            },
            change: function(color) {
                update_blob_color(color);
                update_hex_text(color);
            }
        });
        function update_blob_color(color) {
            $('.blob path').css({'fill': color.toHexString()});
        }
        function update_hex_text(color) {
            $('#blob_color_hex').text(color.toHexString());
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
        for (var i = 0; i < num_figs; i++) {
            draw_one_figure(
                all_signals[i],
                all_names[i],
                get_grid_offset(i),
                i);
        }
    }

    // Redraw all figures if fig_dim or max_svg_width changed from input
    $('input.global').on('change', function() {
        $('#main_svg').remove();
        update_tweak_params();
        draw_all_figures();
    })

    /*************************************************************************
    * DRAW ONE FIGURE
    * - Listener will update each figure if pointiness or fullness changes
    **************************************************************************/
    function draw_one_figure(signals, name, offset, i) {
        /*************************************************************************
        * Variables to be defined and updated
        **************************************************************************/
        var cardinal_line;
        var blob_polygon_vertices, blob_coords;
        var label_vertices; 
        var center = [fig_dim / 2, fig_dim / 2];

        /*************************************************************************
        * Group for this figure
        **************************************************************************/
        var fig_svg = svg.append('g')
            .attr('id', 'fig_' + i)
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
        blob_polygon_vertices = get_polygon_vertices(num_signals*2, radius); // n*2 for intermediate pts
        label_vertices = get_polygon_vertices(num_signals, label_radius);

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
                        $('#intermediate_pts_slider').val());
                    x = center[0] + scale * (vertices[i][0] - center[0]);
                    y = center[1] + scale * (vertices[i][1] - center[1]);
                }
                coords.push([x,y])
            }
            return coords;
        };
        blob_coords = get_blob_coords(center, blob_polygon_vertices, signals, intermediate_pts_value);

        function draw_img_blob(i) {
            // TODO: better img_pad_ratio. Point is for max value to not outermost circle
            var img_pad_ratio = Math.min(1.0, 1.1*Math.max(...signals));
            var img_blob = fig_svg
                .append('g')
                .attr('class', 'blob');

            img_blob.insert('svg:defs', ":first-child")
                .insert('clipPath')
                .attr("id", "pic")
                .append('path')
                .attr("d", cardinal_line(blob_coords))
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
        if (DISPLAY_PHOTO) {
            draw_img_blob(i);
        }
        
        // DRAW COLOR BLOB.
        function draw_color_blob(i) {
            var color_blob = fig_svg
                .append('g')
                .attr('class', 'blob')
                .append('path')
                .attr('d', cardinal_line(blob_coords))
                // .attr("stroke-width", 2)
                .attr('opacity', color_blob_opacity)
                .attr('fill', blob_color);
        }
        draw_color_blob(i);

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
        if (DISPLAY_AXES) {
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
        if (DISPLAY_METRICS) {
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
        if (DISPLAY_METRICS && typeof metric_details !== 'undefined') {
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
        if (DISPLAY_NAME) {
            fig_svg.append('g')
                .attr('id', 'name')
                .append('text')
                .attr('x', center[0])
                .attr('y', center[1] + 1.3 * label_radius) // TODO: auto placement?
                // .text(name + ' (' + final_score + ')')
                .text(name)
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
            redraw_blob(i);
        });

        function redraw_blob(i) {
            update_tweak_params();
            $('#fig_' + i + ' .blob').remove();
            define_cardinal_line(tension);            // In case tension changed
            blob_coords = get_blob_coords(center, blob_polygon_vertices, signals, intermediate_pts_value);  // In case ctrl pts changed
            if (DISPLAY_PHOTO) {
                draw_img_blob(i);
            }
            draw_color_blob(i);
        }
    }

}

