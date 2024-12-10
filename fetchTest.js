"use strict";

const vacEndpoint = "https://da1222.base.datacer.online/vacuum";
const tankEndpoint = "https://da1222.base.datacer.online/tank";
const waterEndpoint = "https://da1222.base.datacer.online/water";
const allEndpoint = "https://da1222.base.datacer.online/all";

async function getDatacerData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const data = await response.json();
        // console.log(data);
        return data;
    } catch (error) {
        console.error(error.message);
    }
}

var water = await getData(waterEndpoint);
console.log(water);
var vacuum = await getData(vacEndpoint);
console.log(vacuum);

////////////////////////////
