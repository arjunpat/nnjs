import Matrix from './Matrix';
import { NetworkArch, ActivationFunction } from './interfaces';

class Network {
	private nodeNums: number[];
	private weights: Matrix[];
	private activationFunction: ActivationFunction;
	private bias: number;
	private learningRate: number;

	constructor(arch: NetworkArch) {

		if (arch.nodeNums.length < 3)
			throw new TypeError('Network does not have 3 or more layers');

		this.nodeNums = arch.nodeNums;
		this.activationFunction = arch.activationFunction;

		this.bias = arch.bias ? arch.bias : 1;
		this.learningRate = arch.learningRate ? arch.learningRate : 0.1;

		this.weights = [];
		for (let i: number = 0; i < this.nodeNums.length - 1; i++) {
			let before: number = this.nodeNums[i],
				after: number = this.nodeNums[i + 1],
				matrix: Matrix = new Matrix(after, before + 1); // +1 for the bias at the end
			
			if (arch.randomizeWeights)
				matrix.randomize(arch.randomizeWeights.from, arch.randomizeWeights.to, arch.randomizeWeights.isInt);

			if (arch.weightInitValue)
				matrix.map(() => arch.weightInitValue);
			
			this.weights.push(matrix);
		}

	}

	predict(inputs: number[], returnAll: boolean = false): Matrix | Matrix[] {

		// load in inputs

		if (inputs.length !== this.nodeNums[0])
			throw new TypeError('Input array length does not match input node number');

		let input_m: Matrix = Matrix.arrayToMatrix(inputs);
		let lastNodes: Matrix[] = [];
		let mat = input_m.clone();

		lastNodes.push(input_m.clone());

		// foward prop algorithm
		for (let i: number = 0; i < this.weights.length; i++) {
			mat.addToBottom([this.bias]); // add bias column to the bottom
			mat = Matrix.product(this.weights[i], mat);

			lastNodes.push(mat.clone());

			mat.map(this.activationFunction.y);
		}

		// when calculating the error, already expecting it to have run through activation function
		lastNodes[lastNodes.length - 1].map(this.activationFunction.y);

		if (returnAll)
			return lastNodes;
		else
			return lastNodes[lastNodes.length - 1];
	}

	train(inputs: number[], desiredOutput: number[]): void {

		// let inputs_m: Matrix = Matrix.arrayToMatrix(inputs);
		let desiredOutput_m: Matrix = Matrix.arrayToMatrix(desiredOutput);
		let guessOutputs_m: any = this.predict(inputs, true); // Matrix[]
		let guessOutput_m: Matrix = guessOutputs_m[guessOutputs_m.length - 1];
		if (desiredOutput_m.getRows() !== guessOutput_m.getRows() || desiredOutput_m.getCols() !== 1)
			throw new TypeError('Target output does not match output schema');
		
		
		// backprop
		let lastError: Matrix = Matrix.subtract(desiredOutput_m, guessOutput_m);
		for (let i: number = this.weights.length - 1; i >= 0; i--) {
			// calc GRADIENT DECENT
			let gradients = guessOutputs_m[i + 1]
				.clone()
				.map(this.activationFunction.dydx)
				.multiply(lastError)
				.multiply(this.learningRate);

			// compute deltas based on gradient
			let deltas: Matrix = Matrix.product(gradients, Matrix.transpose(guessOutputs_m[i]));
			deltas.addToRight(gradients.to1dArray()); // fill bias

			// fix weights
			this.weights[i].add(deltas);

			// compute next layer's error
			lastError = Matrix.product(
				Matrix.transpose(this.weights[i].clone().removeCol(this.weights[i].getCols() - 1)), // remove the biases
				lastError
			);
		}

	}

}

export default Network;
