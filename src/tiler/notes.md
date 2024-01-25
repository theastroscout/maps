```sh
osmium tags-filter --progress --overwrite --verbose \
-o output.pbf
input.pbf \
n/aeroway=terminal,aerodrome \
a/aeroway=apron,terminal,gate,tower,aerodrome \
w/aeroway=taxiway,runway
```

```
osmium extract --bbox LEFT,BOTTOM,RIGHT,TOP \
-o output.pbg \
input.pbf
```