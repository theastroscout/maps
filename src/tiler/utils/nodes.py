'''

Node Parser

'''

def nodeParse(self, o):
	if not o.visible:
		return True

	
	# Get Specification
	spec = self.getConfig(o, 'node')
	
	if not spec:
		return True

	geom = [o.location.lon,o.location.lat]

	self.addFeature(o, spec, geom)
	
	return True