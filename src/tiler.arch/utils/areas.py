import osmium

'''

Area Parser

'''

def areaParse(self, o):
	if not o.visible:
		return True

	# Get Specification
	spec = self.getConfig(o, 'area')	
	
	if not spec:
		return True

	# print('area')

	# Get Polygon
	if isinstance(o, osmium.Way):
		polygon = self.getPolygonFromWay(o)
	else:
		polygon = self.getPolygon(o)

	if 2==3 and o.id == 704819231:
		print(o)
		print(spec)
		print(polygon)
		exit()

	if not polygon:
		return True

	# Added Center Of Polygon to set Names
	# Panda's shit do not support list, so we go with string then
	if 'name' in spec['properties'] and spec['properties']['name']:
		center = '{},{}'.format(round(polygon.centroid.x, 5), round(polygon.centroid.y, 5))
		spec['properties']['center'] = center
	
	self.addFeature(o, spec, polygon)
	
	return True