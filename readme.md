# Surfy° Maps


### Load
```html
<link rel="stylesheet" type="text/css" href="https://maps.surfy.one/maps.css" />
<script type="module" src="https://maps.surfy.one/maps.mjs"></script>
```

### Coords
```js
const coords = [-0.118092, 51.509865]; // [Longitude, Latitude]
```

### Map
```js
const map = new SurfyMaps({
	selector: '#map',
	style: 'chrome',
	center: [-0.118092, 51.509865],
	zoom: 14,
	events: {
		init: event, // Triggers when the map initialised
		movestart: event, // Triggers when the map starts moving
		moveend: event // Triggers when the map stops moving
	}
});

// Forced update of all map entities
map.update();

// Events
function event(data){
	/*
	data {
		zoom: map.options.zoom, // zoom level, float
		center: map.options.center // [longitude, latitude]
	};
	*/
}

```

### Marker
```js

const options = {
	id: '', // Optional. If empty will be assigned.
	coords: [-0.118092, 51.509865],
	class: 'default',
	content: 'HTML, Text or Empty'
};

// Add Marker
const marker = map.addMarker(options);

/*

Override Styles
.SurfyMaps > .overlay > .m {
	position: absolute;
	pointer-events: auto;
}

DOM Element
<div data-id="{id}" class="m {className}">{content}</div>

*/

marker.id; // Marker ID
marker.el; // <DOM Element>

// Position
console.log(marker.coords); // Get
marker.coords = [-0.118092, 51.509865]; // Set

// Content
console.log(marker.content); // Get
marker.content = 'HTML or text'; // Set

// Class
console.log(marker.content); // Get
marker.class = 'default one_more_class'; // Set

/*

Click
Since we need to block scrolling and gestures when panning and zooming the map (e.preventDefault on touchstart),
it's better to use the built-in Click event.

*/

marker.click(callback); // Add Click Event Listener to marker
marker.clickOff(callback); // Remove Click Event Listener to marker

// Remove Marker
marker.remove();

```

<br />

### Custom Layer

```js

const options = {
	bbox: [-0.022221, 51.505552, -0.020372, 51.504904], // [top_left_longitude, top_left_latitude, bottom_right_longitude, bottom_right_latitude]
	url: 'https://example.com/you-svg.svg'
};

const svgElement = await map.addSVG(options);

```