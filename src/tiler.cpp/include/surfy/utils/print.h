#ifndef SURFY_UTILS_PRINT_HPP
#define SURFY_UTILS_PRINT_HPP

namespace surfy::utils {

	std::mutex print_mutex;

	bool printLocked = false;

	// Overload for printing JSON objects
	inline void print(const json& arg) {
		std::cout << arg.dump(1, '\t') << std::endl;
	}

	template<typename T, typename... Args>
	inline void print(const std::vector<T>& arg, const Args&... args) {
		json j = arg;
		std::cout << j.dump();
		if constexpr(sizeof...(args) > 0) {
			std::cout << " ";
			print(args...);
		} else {
			std::cout << std::endl;
		}
	}
	
	template<typename T, typename... Args>
	inline void print(const T& arg, const Args&... args) {
		
		if (!printLocked){
			printLocked = true;
			std::unique_lock<std::mutex> lock(print_mutex);
		}

		std::cout << arg;
		
		if constexpr(sizeof...(args) > 0) {
			std::cout << " ";
			print(args...);
		} else {
			std::cout << std::endl;
		}
		
		printLocked = false;
	}
	
}

#endif