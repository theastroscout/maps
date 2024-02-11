import math
from collections import namedtuple

R2D = 180 / math.pi
RE = 6378137.0
CE = 2 * math.pi * RE
EPSILON = 1e-14
LL_EPSILON = 1e-11

def minmax(zoom):
	"""Minimum and maximum tile coordinates for a zoom level

	Parameters
	----------
	zoom : int
		The web mercator zoom level.

	Returns
	-------
	minimum : int
		Minimum tile coordinate (note: always 0).
	maximum : int
		Maximum tile coordinate (2 ** zoom - 1).

	Raises
	------
	InvalidZoomError
		If zoom level is not a positive integer.

	Examples
	--------
	>>> minmax(1)
	(0, 1)
	>>> minmax(-1)
	Traceback (most recent call last):
	...
	InvalidZoomError: zoom must be a positive integer

	"""

	try:
		if int(zoom) != zoom or zoom < 0:
			raise InvalidZoomError("zoom must be a positive integer")
	except ValueError:
		raise InvalidZoomError("zoom must be a positive integer")

	return (0, 2 ** zoom - 1)

class Tile(namedtuple("Tile", ["x", "y", "z"])):
	"""An XYZ web mercator tile

	Attributes
	----------
	x, y, z : int
		x and y indexes of the tile and zoom level z.

	"""

	def __new__(cls, x, y, z):
		"""A new instance"""
		lo, hi = minmax(z)
		if not lo <= x <= hi or not lo <= y <= hi:
			warnings.warn(
				"Mercantile 2.0 will require tile x and y to be within the range (0, 2 ** zoom)",
				FutureWarning,
			)
		return tuple.__new__(cls, [x, y, z])

def _xy(lng, lat, truncate=False):

	if truncate:
		lng, lat = truncate_lnglat(lng, lat)

	x = lng / 360.0 + 0.5
	sinlat = math.sin(math.radians(lat))

	try:
		y = 0.5 - 0.25 * math.log((1.0 + sinlat) / (1.0 - sinlat)) / math.pi
	except (ValueError, ZeroDivisionError):
		raise InvalidLatitudeError("Y can not be computed: lat={!r}".format(lat))
	else:
		return x, y

def tile(lng, lat, zoom, truncate=False):
	"""Get the tile containing a longitude and latitude

	Parameters
	----------
	lng, lat : float
		A longitude and latitude pair in decimal degrees.
	zoom : int
		The web mercator zoom level.
	truncate : bool, optional
		Whether or not to truncate inputs to limits of web mercator.

	Returns
	-------
	Tile

	"""
	x, y = _xy(lng, lat, truncate=truncate)
	Z2 = math.pow(2, zoom)

	if x <= 0:
		xtile = 0
	elif x >= 1:
		xtile = int(Z2 - 1)
	else:
		# To address loss of precision in round-tripping between tile
		# and lng/lat, points within EPSILON of the right side of a tile
		# are counted in the next tile over.
		xtile = int(math.floor((x + EPSILON) * Z2))

	if y <= 0:
		ytile = 0
	elif y >= 1:
		ytile = int(Z2 - 1)
	else:
		ytile = int(math.floor((y + EPSILON) * Z2))

	return Tile(xtile, ytile, zoom)


def tiles(west, south, east, north, zooms, truncate=False):
	"""Get the tiles overlapped by a geographic bounding box

	Parameters
	----------
	west, south, east, north : sequence of float
		Bounding values in decimal degrees.
	zooms : int or sequence of int
		One or more zoom levels.
	truncate : bool, optional
		Whether or not to truncate inputs to web mercator limits.

	Yields
	------
	Tile

	Notes
	-----
	A small epsilon is used on the south and east parameters so that this
	function yields exactly one tile when given the bounds of that same tile.

	"""
	
	if truncate:
		west, south = truncate_lnglat(west, south)
		east, north = truncate_lnglat(east, north)
	if west > east:
		bbox_west = (-180.0, south, east, north)
		bbox_east = (west, south, 180.0, north)
		bboxes = [bbox_west, bbox_east]
	else:
		bboxes = [(west, south, east, north)]

	for w, s, e, n in bboxes:
		# Clamp bounding values.
		w = max(-180.0, w)
		s = max(-85.051129, s)
		e = min(180.0, e)
		n = min(85.051129, n)

		print(w,s,e,n)

		# if not isinstance(zooms, Sequence):
		# zooms = [zooms]

		for z in zooms:
			ul_tile = tile(w, n, z)
			print(ul_tile)
			lr_tile = tile(e - LL_EPSILON, s + LL_EPSILON, z)
			print(lr_tile)

			for i in range(ul_tile.x, lr_tile.x + 1):
				for j in range(ul_tile.y, lr_tile.y + 1):
					print(z, i, j)

if __name__ == '__main__':
	print('Input', -0.046724, 51.51615, -0.006684, 51.495047)
	tiles(-0.046724, 51.51615, -0.006684, 51.495047, [14])