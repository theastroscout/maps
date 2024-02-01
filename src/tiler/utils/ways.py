'''

Way Parser

'''

def wayParse(self, o):
	if not o.visible:
		return True

	
	# Get Specification
	spec = self.getConfig(o, 'way')
	
	if not spec:
	#	if o.is_closed():
	#		return self.area(o)
		return True

	#print(spec)
	if o.is_closed() and spec['properties']['group'] != 'roads':
		geom = self.getPolygonFromWay(o)
	else:
		# Get Line
		geom = self.getLine(o)

	# if spec['properties']['id'] == 543110149:
		# print(spec)
		# print(o)
		# print('GEOM',geom)
		# print(geom.__dir__)
		
		# print('is_closed', o.is_closed())
		# coords = [(n.lon, n.lat) for n in o.nodes]
		# print(coords)
		
		# exit()

	if not geom:
		return True

	self.addFeature(o, spec, geom)
	
	return True