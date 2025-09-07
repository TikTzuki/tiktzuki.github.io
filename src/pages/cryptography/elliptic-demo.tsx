import React, {useRef, useState} from "react";
import {Card, CardContent} from "@site/src/components/ui/card";
import {Button} from "@site/src/components/ui/button";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/core/lib/client/exports/useDocusaurusContext";
import {Input} from "@site/src/components/ui/input";

function EllipticCurveDemo() {
    const [a, setA] = useState(-1);
    const [b, setB] = useState(1);
    const [p, setP] = useState(97);
    const [mode, setMode] = useState<"real" | "modp">("real");
    const [point1, setPoint1] = useState<[number, number] | null>(null);
    const [point2, setPoint2] = useState<[number, number] | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const scale = 50;
    const xmin = -3;
    const xmax = 3;

    const pointAddReal = (P: [number, number], Q: [number, number]): [number, number] => {
        const [x1, y1] = P;
        const [x2, y2] = Q;
        let m;
        if (x1 === x2 && y1 === y2) {
            // point doubling (tangent)
            m = (3 * x1 ** 2 + a) / (2 * y1);
        } else {
            // secant
            m = (y2 - y1) / (x2 - x1);
        }
        const x3 = m ** 2 - x1 - x2;
        const y3 = m * (x1 - x3) - y1;
        return [x3, y3];
    };

    const drawRealCurve = (ctx: CanvasRenderingContext2D) => {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        ctx.clearRect(0, 0, width, height);

        const originX = width / 2;
        const originY = height / 2;

        // axes
        ctx.strokeStyle = "#000";
        ctx.beginPath();
        ctx.moveTo(0, originY);
        ctx.lineTo(width, originY);
        ctx.moveTo(originX, 0);
        ctx.lineTo(originX, height);
        ctx.stroke();

        // curve (upper branch)
        ctx.strokeStyle = "blue";
        ctx.beginPath();
        for (let px = xmin; px <= xmax; px += 0.01) {
            const rhs = px ** 3 + a * px + b;
            if (rhs >= 0) {
                const y = Math.sqrt(rhs);
                const cx = originX + px * scale;
                const cy1 = originY - y * scale;
                ctx.lineTo(cx, cy1);
            }
        }
        ctx.stroke();

        // curve (lower branch)
        ctx.beginPath();
        for (let px = xmin; px <= xmax; px += 0.01) {
            const rhs = px ** 3 + a * px + b;
            if (rhs >= 0) {
                const y = Math.sqrt(rhs);
                const cx = originX + px * scale;
                const cy2 = originY + y * scale;
                ctx.lineTo(cx, cy2);
            }
        }
        ctx.stroke();

        // if points selected
        if (point1 && point2) {
            const [x1, y1] = point1;
            const [x2, y2] = point2;
            const [xr, yr] = pointAddReal(point1, point2);
            const result: [number, number] = [xr, -yr];

            // draw P, Q
            ctx.fillStyle = "red";
            ctx.beginPath();
            ctx.arc(originX + x1 * scale, originY - y1 * scale, 5, 0, 2 * Math.PI);
            ctx.fill();

            ctx.fillStyle = "green";
            ctx.beginPath();
            ctx.arc(originX + x2 * scale, originY - y2 * scale, 5, 0, 2 * Math.PI);
            ctx.fill();

            // intersection R
            ctx.fillStyle = "orange";
            ctx.beginPath();
            ctx.arc(originX + xr * scale, originY - yr * scale, 5, 0, 2 * Math.PI);
            ctx.fill();

            // reflected point P+Q
            ctx.fillStyle = "purple";
            ctx.beginPath();
            ctx.arc(originX + result[0] * scale, originY - result[1] * scale, 5, 0, 2 * Math.PI);
            ctx.fill();

            // secant or tangent line
            ctx.strokeStyle = "black";
            ctx.beginPath();
            if (x1 === x2 && y1 === y2) {
                // tangent at P
                const m = (3 * x1 ** 2 + a) / (2 * y1);
                const lineX = [-3, 3];
                ctx.moveTo(originX + lineX[0] * scale, originY - (m * (lineX[0] - x1) + y1) * scale);
                ctx.lineTo(originX + lineX[1] * scale, originY - (m * (lineX[1] - x1) + y1) * scale);
            } else {
                ctx.moveTo(originX + x1 * scale, originY - y1 * scale);
                ctx.lineTo(originX + x2 * scale, originY - y2 * scale);
            }
            ctx.stroke();

            // reflection arrow
            ctx.strokeStyle = "purple";
            ctx.beginPath();
            ctx.moveTo(originX + xr * scale, originY - yr * scale);
            ctx.lineTo(originX + result[0] * scale, originY - result[1] * scale);
            ctx.stroke();
        }
    };

    const drawModPCurve = (ctx: CanvasRenderingContext2D) => {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = "blue";
        const scale = Math.min(width, height) / p;

        for (let x = 0; x < p; x++) {
            const rhs = (x ** 3 + a * x + b) % p;
            for (let y = 0; y < p; y++) {
                if ((y * y) % p === rhs) {
                    const cx = x * scale;
                    const cy = height - y * scale;
                    ctx.beginPath();
                    ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }
    };

    const generate = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (mode === "real") {
            drawRealCurve(ctx);
        } else {
            drawModPCurve(ctx);
        }
    };

    return (
        <div className="p-6 grid gap-4">
            <Card className="p-4">
                <CardContent className="grid gap-2">
                    <div className="grid grid-cols-3 gap-2">
                        <label>
                            a:
                            <Input
                                type="number"
                                value={a}
                                onChange={(e) => setA(parseFloat(e.target.value))}
                            />
                        </label>
                        <label>
                            b:
                            <Input
                                type="number"
                                value={b}
                                onChange={(e) => setB(parseFloat(e.target.value))}
                            />
                        </label>
                        <label>
                            p:
                            <Input
                                type="number"
                                value={p}
                                onChange={(e) => setP(parseInt(e.target.value))}
                                disabled={mode === "real"}
                            />
                        </label>
                    </div>

                    <div className="flex gap-2 mt-2">
                        <Button onClick={() => setMode("real")}>
                            Real Curve
                        </Button>
                        <Button onClick={() => setMode("modp")}>
                            Mod p Curve
                        </Button>
                        <Button onClick={generate}>Generate</Button>
                    </div>

                    {mode === "real" && (
                        <div className="flex gap-4 mt-2">
                            <label>
                                Point P (x,y):
                                <Input
                                    type="text"
                                    placeholder="e.g. 0,1"
                                    onBlur={(e) => {
                                        const [x, y] = e.target.value.split(",").map(Number);
                                        setPoint1([x, y]);
                                    }}
                                />
                            </label>
                            <label>
                                Point Q (x,y):
                                <Input
                                    type="text"
                                    placeholder="e.g. 1,1"
                                    onBlur={(e) => {
                                        const [x, y] = e.target.value.split(",").map(Number);
                                        setPoint2([x, y]);
                                    }}
                                />
                            </label>
                        </div>
                    )}
                </CardContent>
            </Card>

            <canvas ref={canvasRef} width={600} height={600} className="border rounded shadow"/>
        </div>
    );
}

export default function EllipticDemoPage() {
    const {siteConfig} = useDocusaurusContext();
    return (
        <Layout
            title={`${siteConfig.title}`}
            description="Description will go into a meta tag in <head />">
            <main>
                <div className="container">
                    <EllipticCurveDemo/>
                </div>
            </main>
        </Layout>
    );
}