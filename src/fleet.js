const express = require('express');
const router = express.Router();
const { GeneticAlgorithm } = require('genetic-algorithm');
const Landfill = require('../models/landfill'); // Import Landfill model

// Define genetic algorithm parameters
let truckCapacities = {};
let distanceToLandfills = {};
const fuelEfficiency = 0.1;  // Example fuel efficiency of trucks (fuel consumption per distance)
const maxTripsPerTruck = 3;
let maxTotalTrips = 0;

// Fetch data from MongoDB and set genetic algorithm parameters
async function fetchDataAndSetParameters() {
    try {
        // Fetch data from MongoDB collections
        const landfills = await Landfill.find({});
        const sts = await sts.findOne({ wardNumber: 123 });

        // Extract data from fetched documents
        const stsLatitude = sts.latitude;
        const stsLongitude = sts.longitude;

        landfills.forEach(landfill => {
            const capacities = landfill.capacity.map(capacity => capacity);
            truckCapacities[landfill.landfillId] = capacities;

            // Calculate distance from STS to landfill using Haversine formula
            const landfillLatitude = landfill.latitude;
            const landfillLongitude = landfill.longitude;
            const distance = calculateDistance(stsLatitude, stsLongitude, landfillLatitude, landfillLongitude);
            distanceToLandfills[landfill.landfillId] = distance;
        });

        // Calculate max total trips
        maxTotalTrips = Object.keys(truckCapacities).length * maxTripsPerTruck;

    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Function to calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1); // deg2rad below
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Define objective functions
function fuelConsumptionCost(truckSelection) {
    let totalDistance = 0;
    Object.keys(truckSelection).forEach(landfill => {
        totalDistance += truckSelection[landfill].reduce((acc, trips) => acc + trips * distanceToLandfills[landfill], 0);
    });
    return totalDistance * fuelEfficiency;
}

function numberOfTrucksUsed(truckSelection) {
    let totalTrucks = 0;
    Object.keys(truckSelection).forEach(landfill => {
        totalTrucks += truckSelection[landfill].reduce((acc, trips) => acc + (trips > 0 ? 1 : 0), 0);
    });
    return totalTrucks;
}

// Define constraints
function isValidSolution(truckSelection) {
    let totalTrips = 0;
    Object.values(truckSelection).forEach(trips => {
        totalTrips += trips.reduce((acc, val) => acc + val, 0);
    });
    return totalTrips <= maxTotalTrips;
}

// Define mutation function
function mutationFunction(individual) {
    // Clone the individual to avoid modifying the original
    const mutatedIndividual = Object.assign({}, individual);

    // Randomly select a truck and a trip and mutate it
    const landfillKeys = Object.keys(mutatedIndividual);
    const randomLandfillIndex = Math.floor(Math.random() * landfillKeys.length);
    const landfillKey = landfillKeys[randomLandfillIndex];
    const truckTrips = mutatedIndividual[landfillKey];
    const randomTripIndex = Math.floor(Math.random() * truckTrips.length);

    // Mutate the selected trip (increase or decrease by 1)
    if (Math.random() < 0.5 && truckTrips[randomTripIndex] < maxTripsPerTruck) {
        truckTrips[randomTripIndex]++;
    } else if (truckTrips[randomTripIndex] > 0) {
        truckTrips[randomTripIndex]--;
    }

    return mutatedIndividual;
}

// Define crossover function
function crossoverFunction(parent1, parent2) {
    // Clone the parents to avoid modifying the originals
    const child1 = Object.assign({}, parent1);
    const child2 = Object.assign({}, parent2);

    // Randomly select a crossover point
    const crossoverPoint = Math.floor(Math.random() * Object.keys(child1).length);

    // Perform crossover
    const landfillKeys = Object.keys(child1);
    for (let i = 0; i < landfillKeys.length; i++) {
        if (i < crossoverPoint) {
            // Swap trips before the crossover point
            const temp = child1[landfillKeys[i]];
            child1[landfillKeys[i]] = child2[landfillKeys[i]];
            child2[landfillKeys[i]] = temp;
        }
    }

    return [child1, child2];
}

// Define fitness function
function fitnessFunction(individual) {
    const truckSelection = decodeIndividual(individual);
    const fuelCost = fuelConsumptionCost(truckSelection);
    const numTrucks = numberOfTrucksUsed(truckSelection);
    return [fuelCost, numTrucks];
}

// Helper function to decode individual into truck selection
function decodeIndividual(individual) {
    const truckSelection = {};
    Object.keys(individual).forEach(landfill => {
        truckSelection[landfill] = individual[landfill].map(trips => Math.round(trips));
    });
    return truckSelection;
}

// Define genetic algorithm parameters
const ga = new GeneticAlgorithm({
    mutationFunction: mutationFunction,
    crossoverFunction: crossoverFunction,
    fitnessFunction: fitnessFunction,
    isValidSolutionFunction: isValidSolution,
    populationSize: 100,
    crossoverProbability: 0.8,
    mutationProbability: 0.2,
    elitism: true,
    maxGenerations: 100,
});

// Route handler to run genetic algorithm and get optimal solution
router.get('/optimize-fleet', async (req, res) => {
    try {
        await fetchDataAndSetParameters(); // Fetch data from the database and set GA parameters
        
        // Run genetic algorithm
        const result = ga.run();
        
        // Decode the result for response
        const optimalSolution = decodeIndividual(result.bestIndividual);
        const fuelCost = fuelConsumptionCost(optimalSolution);
        const numTrucks = numberOfTrucksUsed(optimalSolution);

        // Send response with decoded optimal solution and its associated fuel cost and number of trucks
        res.json({
            optimalSolution: optimalSolution,
            fuelCost: fuelCost,
            numTrucks: numTrucks
        });

    } catch (error) {
        console.error('Error during optimization:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
