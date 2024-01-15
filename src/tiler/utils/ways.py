'''

Way Parser

'''

def wayParse(self, o):
	if not o.visible:
		return True
	
	# Get Specification
	spec = self.getConfig(o, 'way')
	
	if not spec:
		return True

	# Get Line
	line = self.getLine(o)
	if not line:
		return True

	self.addFeature(o, spec, line)
	
	return True