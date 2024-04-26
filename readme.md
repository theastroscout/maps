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
	zoom: 14
});

```

### Marker
```js

const options = {
	id: '', // Optional. Must be unique. If empty will be assigned.
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
<div class="m {className}" data-id="{id}">{content}</div>

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
marker.class = 'default'; // Set

// Remove Marker
marker.remove();

```

<br />

### Custom Layer

```js

const options = {
	bbox: [-0.022221, 51.505552, -0.020372, 51.504904],
	url: 'https://example.com/you-svg.svg'
};

const layer = await map.addSVG(options);

```