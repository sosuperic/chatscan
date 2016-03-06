# radar
Radar chart visualizations

## Usage
- Your HTML should have an empty div with id viz, i.e. `<div id="viz"></div>`
- After importing radar.js and the required js/css dependencies, call `render_radars(data_or_path, params)`, where data_or_path is either a js object or a path to a csv/json file, and params is an associative array that controls display parameters, as well as data normalization parameters. 

## Parameters
- Found in read_params of render_radars (default values also defined here)
- display_name: boolean, show name at bottom of radar
- display_axes: boolean, show axes lines
- display_metrics: boolean, show axes labels (e.g. categories)
- display_metric_details: boolean, show extra information under each axes label (e.g. exact value of topic affinity); 
- display_photo: boolean, show photo in blob. Photo filename must be same as name
- tweak_mode: boolean, show tweakable parameters sliders and inputs controlling size and color
- normalize_data: boolean, option to normalize data
- normalize_by: string - 'person' or 'all', normalize per radar chart or across all 

## Running fingerprint.html
- Because files cannot be opened in browsers locally, run a webserver for that directory e.g.
  `python -m SimpleHTTPServer 8888 &` and visit http://localhost:8888/fingerprint.html

## CSV files
- File format:
```
  Name,category1,category2,category3
  Eric,0.3,0.4,0.5
  Atlas,0.2,0.6,0.4
```
## JSON files / Javascript objects
- Format:
```
{
  "start": "2015-07-21",
  "end": "2015-07-27",
  "data": {
    "John Kasich": {
      "immigration": 4,
      "economy": 3.23,
      "foreign policy": 2.56,
      "education": 2.89,
      "guns": 1.2
    },
    "Hillary Clinton": {
      "immigration": 2.6,
      "economy": 3.3,
      "foreign policy": 5.3,
      "education": 1.2,
      "guns": 4.4
    }
  }
}
```

## TODO
- Only modify CSS when updating blob opacity sliders, don't redraw
- Option to use different scale (e.g. log) using D3 scales
- Position the picture in center of blob
- Calculate area of blob (using cross product / Green's Theorem?)
