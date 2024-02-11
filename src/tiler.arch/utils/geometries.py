import osmium
import shapely.wkb as wkblib
from shapely.geometry import mapping as mapper, shape, LineString, Polygon
wkbfab = osmium.geom.WKBFactory()

def getPolygonFromWay(self, o):
	coords = [(n.lon, n.lat) for n in o.nodes]
	return Polygon(coords)

'''

	Get Polygon

'''

def getPolygon(self, o):

	try:
		wkbshape = wkbfab.create_multipolygon(o)
	except:
		wkbshape = False

	if not wkbshape:
		return False

	shapely_obj = wkblib.loads(wkbshape, hex=True)

	return shapely_obj


'''

	Get Line

'''

def getLine(self, o, compress=False):
	
	try:
		wkbshape = wkbfab.create_linestring(o)
	except:
		wkbshape = False

	if not wkbshape:
		return False

	line = wkblib.loads(wkbshape, hex=True)
	
	if compress:
		line = line.simplify(tolerance=.00001)

	return line

'''

	Mapping

'''

def set_precision(coords, precision):
	result = []
	try:
		return round(coords, precision)
	except TypeError:
		for coord in coords:
			result.append(set_precision(coord, precision))
	return result

def mapping(self, coords):
	c = mapper(coords)
	c['coordinates'] = set_precision(c['coordinates'], 6)
	return c