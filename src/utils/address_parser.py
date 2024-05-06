import pymongo
import osmium
wkbfab = osmium.geom.WKBFactory()
from shapely.geometry import Point, Polygon, MultiPolygon, mapping
import shapely.wkb as wkblib

class OSM_handler(osmium.SimpleHandler):

	def node(self, o):
		add_place(o, 'node')

	def area(self, o):
		add_place(o, 'area')

def add_place(o, geom_type):
	print(o)

	location = None
	if geom_type == 'node':
		location = mapping(Point([o.location.lon,o.location.lat]))

	item = {
		'oid': o.id,
		'admin_level': o.tags.get('admin_level'),
		'location': location
	}

if __name__ == '__main__':
	db_client = pymongo.MongoClient('mongodb://localhost:27017/')
	db = db_client['Maps']
	locations_collection = db['locations']

	handler = OSM_handler()
	idx = 'sparse_file_array,/storage/maps/tmp/tmp.nodecache'
	pbf_input = '/storage/maps/tiles/isle-of-dogs/src.pbf'
	handler.apply_file(pbf_input, locations=True, idx=idx)