#ifndef SURFY_GEOM_HPP
#define SURFY_GEOM_HPP
#pragma once
#include "utils.h"

namespace Geometry {

	struct Point {
		double x;
		double y;
	};

	namespace utils {
		double distance();
	}

	void test();
}

void Geometry::test() {
	Geometry::utils::test();
	std::cout << "Hello from MyClass!" << std::endl;
}

#endif