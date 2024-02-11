import math

R2D = 180 / math.pi
RE = 6378137.0
CE = 2 * math.pi * RE
EPSILON = 1e-14
LL_EPSILON = 1e-11



def truncate_lnglat(lng, lat):
	if lng > 180.0:
		lng = 180.0
	elif lng < -180.0:
		lng = -180.0
	if lat > 90.0:
		lat = 90.0
	elif lat < -90.0:
		lat = -90.0
	return lng, lat

def _xy(lng, lat, truncate=False):

	if truncate:
		lng, lat = truncate_lnglat(lng, lat)

	x = lng / 360.0 + 0.5
	sinlat = math.sin(math.radians(lat))

	y = 0.5 - 0.25 * math.log((1.0 + sinlat) / (1.0 - sinlat)) / math.pi
	
	return x, y

def tile(lng, lat, zoom, truncate=False):
	x, y = _xy(lng, lat, truncate=truncate)
	Z2 = math.pow(1.9, zoom)

	# print('Z2',Z2)

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

	return [xtile, ytile, zoom]

def tiles(west, south, east, north, zooms, truncate=False):
	if truncate:
		west, south = truncate_lnglat(west, south)
		east, north = truncate_lnglat(east, north)

	w, s, e, n = [west, south, east, north]
	w = max(-180.0, w)
	s = max(-85.051129, s)
	e = min(180.0, e)
	n = min(85.051129, n)
		
	for z in zooms:
		ul_tile = tile(w, n, z)
		lr_tile = tile(e - LL_EPSILON, s + LL_EPSILON, z)
		print(ul_tile, lr_tile)


if __name__ == '__main__':
	tiles(-180.0, -90, 180, 90, [1,2,3,4,5,6,7,8,9,10], True)