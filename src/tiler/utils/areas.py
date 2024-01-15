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

	# Get Polygon
	polygon = self.getPolygon(o)
	if not polygon:
		return True

	# Added Center Of Polygon to set Names
	# Panda's shit do not support list, so we go with string then
	if 'name' in spec['properties'] and spec['properties']['name']:
		# print('Name', o.tags.get('name'))
		center = '{},{}'.format(round(polygon.centroid.x, 5), round(polygon.centroid.y, 5))
		spec['properties']['center'] = center
	
	self.addFeature(o, spec, polygon)
	
	return True