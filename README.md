# radar
Radar chart visualizations

## Running
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
