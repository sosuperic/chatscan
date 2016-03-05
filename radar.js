
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

/*************************************************************************
* READ CSV, SET VARIABLES, DRAW
**************************************************************************/
function render_radars(path, tweak_mode) {
    if (!tweak_mode) {
        $('.tweaks').hide();
    }

    // Variables from sliders
    // Adjust the constants
    var radius = FIG_DIM * 0.25;        
    var label_radius = radius * 1.4;    
    var label_fontsize = radius / 10;
    var name_fontsize = radius / 5;
    var label_vertical_spacing = label_fontsize * 1.5;

    // Variables to be defined and updated from csv
    // Constant across figures 
    var svg, width, height;         // W & H depend on number of people.
    var num_figs,
        num_signals,
        metrics = [];               // e.g. Mentions Count, Immigration
    // Varying across figures
    var all_signals = [],
        all_names  = [];

    d3.csv(path, function(data) {
        // Set width and height of svg using num_figs
        // Width is either a) width of figs, e.g. MAX_SVG_WIDTH = 1400, 1 fig of FIG_DIM 500
        // or b) filled in as wide as possible (after which it wraps to next row)
        num_figs = data.length;
        width = Math.min(num_figs * FIG_DIM, MAX_SVG_WIDTH - (MAX_SVG_WIDTH % FIG_DIM));
        height = (Math.floor((num_figs * FIG_DIM) / width) + 1) * FIG_DIM;

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
            if (NORMALIZE_BY == 'person') {
                for (var i = 0; i < num_figs; i++) {
                    var max_value = max_of_array(all_signals[i]);
                    for (var j = 0; j < all_signals[i].length; j++) {
                        all_signals[i][j] /= max_value;
                    }
                }
            } else if (NORMALIZE_BY == 'all') {
                var max_value = max_of_nested_array(all_signals);
                for (var i = 0; i < num_figs; i++) {
                    for (var j = 0; j < all_signals[i].length; j++) {
                        all_signals[i][j] /= max_value;
                    }
                }
            }
        }

        // Now that width and height defined, append svg
        svg = d3.select("#viz")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        // Draw figures
        draw_all_figures();
    });

    function get_grid_offset(i) {   // Get translate offset for ith out of n figures
        var off_x = (i % (width / FIG_DIM)) * FIG_DIM;
        var off_y = Math.floor((i * FIG_DIM) / width) * FIG_DIM;
        var offset = [off_x, off_y];
        return offset;
    }

    function draw_all_figures() {
        for (var i = 0; i < num_figs; i++) {
            draw_one_figure(
                all_signals[i],
                all_names[i],
                get_grid_offset(i),
                i);
        }
    }


    function draw_one_figure(signals, name, offset, i) {
        /*************************************************************************
        * Variables to be defined and updated
        **************************************************************************/
        var tension, cardinal_line;
        var blob_polygon_vertices, blob_coords;
        var label_vertices; 
        var center = [FIG_DIM / 2, FIG_DIM / 2];

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
        function define_cardinal_line() {
            var tension = $('#tensionSlider').val();
            cardinal_line = d3.svg.line()
            .x(function(d) { return d[0]; })
            .y(function(d) { return d[1]; })
            .interpolate("cardinal-closed")
            .tension(tension);
        }
        define_cardinal_line();

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
                        $('#intermediatePtsSlider').val());
                    x = center[0] + scale * (vertices[i][0] - center[0]);
                    y = center[1] + scale * (vertices[i][1] - center[1]);
                }
                coords.push([x,y])
            }
            return coords;
        };
        blob_coords = get_blob_coords(center, blob_polygon_vertices, signals);

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
                // .attr("stroke", "#0065cc")
                // .attr("stroke-width", 2)
                // .attr('opacity', 0.5)
                .attr('fill', '#7CBEC6')
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

        * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

        * * * * * * * * * * * * * EVENT LISTENERS * * * * * * * * * * * * * * * * 

        * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        
        ************************************************************************/


        /************************************************************************
        * REDRAW BLOBS WHEN SLIDER MOVES
        * TODO: Update shapes without fully redrawing? Having trouble with tension.
        **************************************************************************/
        $('input').on('change', function() {
            redraw_blobs(i);
        });

        function redraw_blobs(i) {
            $('#fig_' + i + ' .blob').remove();
            define_cardinal_line();            // In case tension changed
            blob_coords = get_blob_coords(center, blob_polygon_vertices, signals);  // In case ctrl pts changed
            if (DISPLAY_PHOTO) {
                draw_img_blob(i);
            }
            draw_color_blob(i);
        }
    }

}

