import osmium
wkbfab = osmium.geom.WKBFactory()
from shapely.geometry import Point, Polygon, MultiPolygon, mapping
import shapely.wkb as wkblib

types = []

class OSM_handler(osmium.SimpleHandler):

	# def __init__(self,):

	def node(self, o):

		if 'amenity' in o.tags:
			print(get_data(o, 'node'))

	def area(self, o):
		
		if 'amenity' in o.tags:
			print(get_data(o, 'area'))

def get_data(o, geom_type):
	amenity = o.tags.get('amenity')
	name = o.tags.get('name')

	if not name and 'addr:housename' in o.tags:
		name = o.tags.get('addr:housename')

	if not name:
		name = amenity

	location = False
	if geom_type == 'node':
		location = mapping(Point([o.location.lon,o.location.lat]))
	else:
		wkbshape = wkbfab.create_multipolygon(o)
		location = mapping(wkblib.loads(wkbshape, hex=True))


	return {
		'geom_type': geom_type,
		'name': parse_name(name),
		'type': amenity,
		'location': location
	}

def parse_name(name):
	name = name.split('_')
	name = ' '.join(name).capitalize()
	return name


if __name__ == '__main__':
	
	handler = OSM_handler()
	idx = 'sparse_file_array,/storage/maps/tmp/tmp.nodecache'
	pbf_input = '/storage/maps/tiles/isle-of-dogs/src.pbf'
	handler.apply_file(pbf_input, locations=True, idx=idx)
	
	# ['parking', 'fountain', 'school', 'bicycle_parking', 'events_venue', 'place_of_worship', 'toilets', 'townhall', 'waste_disposal', 'court_yard', 'community_centre', 'shelter', 'shower', 'car_sharing', 'bar', 'grave_yard', 'dressing_room', 'bench', 'parking_space', 'boat_storage', 'motorcycle_parking', 'charging_station', 'car_wash']
	# print(types)