import osmium
import shapely.wkb as wkblib
from shapely.geometry import mapping as mapper, LineString, Polygon
wkbfab = osmium.geom.WKBFactory()

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

def mapping(self, coords):
	return mapper(coords)