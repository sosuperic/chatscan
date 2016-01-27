# radar
Radar chart visualizations

## CSV files
- File format:
```
  Name,category1,category2,category3
  Eric,0.3,0.4,0.5
  Atlas,0.2,0.6,0.4
```
- Because files cannot be opened in browsers locally, run a webserver for that directory e.g.
  `python -m SimpleHTTPServer 8888 &` and visit http://localhost:8888/fingerprint.html

## TODO
- Option to use different scale (e.g. log) using D3 scales
- Break out javascript into radar.js file
- Position the picture in center of blob
- Calculate area of blob (using cross product / Green's Theorem?)
