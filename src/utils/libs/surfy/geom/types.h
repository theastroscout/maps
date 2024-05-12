#ifndef GEOM_TYPES_HPP
#define GEOM_TYPES_HPP

namespace surfy::geom::types {

	struct Point {
		double x;
		double y;
	};

	struct Line {
		double length = 0;
		std::vector<Point> coords;
		std::string wkt() const; // Return WKT string
	};
}

#endif