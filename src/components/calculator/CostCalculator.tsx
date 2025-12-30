"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingDown } from "lucide-react";

export function CostCalculator() {
  const [distance, setDistance] = useState("");
  const [people, setPeople] = useState("4");
  const [petrolPrice, setPetrolPrice] = useState("280");

  const calculateCost = () => {
    if (!distance) return null;
    const dist = parseFloat(distance);
    const ppl = parseInt(people);
    const petrol = parseFloat(petrolPrice);

    const dailyDistance = dist * 2; // Round trip
    const monthlyDistance = dailyDistance * 22; // Working days
    const monthlyPetrol = (monthlyDistance / 12) * petrol; // Average km per liter
    const totalCost = monthlyPetrol;
    const perPerson = totalCost / ppl;
    const careemDaily = 9000;
    const careemMonthly = careemDaily * 22;
    const savings = careemMonthly - perPerson;

    return {
      monthlyPetrol,
      totalCost,
      perPerson,
      careemMonthly,
      savings,
    };
  };

  const result = calculateCost();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cost Calculator</h1>
        <p className="text-muted-foreground mt-2">
          Calculate monthly carpool costs and savings
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Input Details
            </CardTitle>
            <CardDescription>
              Enter route and cost parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="distance">One-way Distance (km)</Label>
              <Input
                id="distance"
                type="number"
                placeholder="25"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="people">Number of People</Label>
              <Input
                id="people"
                type="number"
                placeholder="4"
                value={people}
                onChange={(e) => setPeople(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="petrolPrice">Petrol Price (PKR/Liter)</Label>
              <Input
                id="petrolPrice"
                type="number"
                placeholder="280"
                value={petrolPrice}
                onChange={(e) => setPetrolPrice(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Calculation Results
            </CardTitle>
            <CardDescription>
              Monthly breakdown and savings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Petrol:</span>
                    <span className="font-medium">{result.monthlyPetrol.toLocaleString()} PKR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-medium">{result.totalCost.toLocaleString()} PKR</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Per Person:</span>
                      <span className="font-bold text-lg">{result.perPerson.toLocaleString()} PKR</span>
                    </div>
                  </div>
                  <div className="border-t pt-2 mt-2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Careem Monthly:</span>
                      <span className="font-medium">{result.careemMonthly.toLocaleString()} PKR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-green-600">Your Savings:</span>
                      <span className="font-bold text-lg text-green-600">
                        {result.savings.toLocaleString()} PKR
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter distance to calculate costs</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

