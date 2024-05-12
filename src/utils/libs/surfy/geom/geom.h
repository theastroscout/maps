#ifndef GEOM_HPP
#define GEOM_HPP
#pragma once
#include <vector>

namespace surfy::geom {

	// namespace types {};

	/*
	struct Point {
		double x;
		double y;
	};

	struct Info {
		unsigned int vertices = 0;
		double length = 0;
		double area = 0;
	};

	struct Line {
		double length = 0;
		std::vector<Point> coords;
		std::string wkt() const; // Return WKT string
	};

	struct MultiLine {
		unsigned int vertices = 0;
		double length = 0;
		std::vector<Line> items;
	};

	struct Polygon {
		unsigned int vertices = 0;
		double area = 0;
		double length = 0;
		std::vector<Point> inner;
		std::vector<Point> outer;
		std::string wkt() const; // Return WKT string
	};

	struct MultiPolygon {
		unsigned int vertices = 0;
		double area = 0;
		double length = 0;
		std::vector<Polygon> items;
		std::string wkt() const; // Return WKT string
	};
	*/

	namespace utils {};

	void test();
}

#include "types.h"
#include "utils.h"

namespace surfy::geom {
	/*
	class Geometry {
	public:
	    virtual ~Geometry() = default;
	};
	*/

	struct Point {
		std::string type = "Point";
		double x;
	};

	struct Line {
		std::string type = "Line";
		double x;
		double y;
	};

	struct Polygon {
		std::string type = "Polygon";
	};

	
	class Shape {



	public:
		
		unsigned int vertices = 0;
		double length = 0;
		double area = 0;
		std::string type;
		
		/*union Geometry {
	        Point point;
	        Line line;
	        Geometry() {} // Default constructor to satisfy the union requirements
        	~Geometry() {} // Destructor to ensure proper cleanup
	    } geom;
	    */
	    
	    // template<typename Geom>
	    // Geom geom;

	    union {
	        int intValue;
	        float floatValue;
	        double doubleValue;
	    } num;

	    
		Shape(const std::string& src) {
	        if (src.find("POINT") != std::string::npos) {
	            type = "Point";
	            num.intValue = 1;
	            // Point point;
	            // geom = point;
	            // std::cout << geom.point.x << std::endl;
	            // std::cout << geom.line.x << std::endl;
	           //  Point point;
	            /*
	            new (&geom.point) Point();
	            
	            geom.point.x = 2;
	            geom.line.x = 3;

	            std::cout << geom.point.x << std::endl;
	            std::cout << geom.line.x << std::endl;*/

	            // point.x = 10;
	            // geom.point = point;
	            // new (&geom.point) Point(); // Placement new to initialize the point member
	        } else if (src.find("LINE") != std::string::npos) {
	            type = "Line";
	            num.doubleValue = 1.3;
	            // Line line;
	            // geom = line;
	            // new (&geom.line) Line(); // Placement new to initialize the line member
	        }
	    }

	    ~Shape() {
	    	/*
	        if (type == "Point") {
	            geom.point.~Point(); // Explicitly call the destructor for Point
	        } else if (type == "Line") {
	            geom.line.~Line(); // Explicitly call the destructor for Line
	        }
	        */
	    }
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