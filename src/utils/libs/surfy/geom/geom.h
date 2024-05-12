#ifndef GEOM_HPP
#define GEOM_HPP
#pragma once
#include <iostream>
#include <string>
#include <vector>

namespace surfy::geom {

	struct Geometry {
		unsigned int vertices = 0;
		double length = 0;
		double area = 0;
		std::string wkt() const; // Return WKT string
	};

	struct Point {
		double x;
		double y;
	};

	struct Line : public Geometry {
		std::vector<Point> coords;		
	};

	struct MultiLine : public Geometry {
		std::vector<Line> items;
	};

	struct Polygon : public Geometry {
		std::vector<Point> inner;
		std::vector<Point> outer;
	};

	struct MultiPolygon : public Geometry {
		std::vector<Polygon> items;
	};

	namespace utils {};



	void test();
}

#include "types.h"
#include "utils.h"


namespace surfy::geom {
	
	class Shape {
	public:
		std::string type;

		union Geometry {
			Point point;
			Line line;
			Geometry(){}
			~Geometry(){}
		} geom;
		

		Shape (const std::string& src) {
			if (src.find("POINT") != std::string::npos) {
				type = "Point";
				geom.point.x = 2;
			} else if (src.find("LINE") != std::string::npos) {
				type = "Line";
			}
		}
		~Shape() {}
	};

}

void surfy::geom::test() {
	/*Point point;
	point.x = 10;
	point.y = 15;
	surfy::geom::utils::distance(point);
	*/
	std::cout << "Hello from MyClass!" << std::endl;
}

#endif