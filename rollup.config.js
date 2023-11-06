import typescript from "@rollup/plugin-typescript";

export default {
	input: "./src/install.ts",
	output: {
		file: "dist/install.js",
		format: "es",
		sourcemap: true,
	},
	plugins: [typescript()],
};
