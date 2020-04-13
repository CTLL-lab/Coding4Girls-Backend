import { executeQuery } from '../includes/db';

export async function addMetric(
  cpu: string,
  gpu: string,
  ram: number,
  vram: number,
  os: string,
  cores: number,
  scene: string,
  avgFPS: number
) {
  /*
      @ Returns true if metrics were stored successfully
      @ or false if it failed
      */

  let res;
  try {
    res = await executeQuery(
      'INSERT INTO game_metrics (cpu,gpu,ram,vram,os,cores,scene,avg_fps) VALUES ($1,$2,$3,$4,$5, $6,$7,$8)',
      [cpu, gpu, ram, vram, os, cores, scene, avgFPS]
    );
  } catch (err) {
    throw err;
  }
  return res.rowCount > 0 ? true : false;
}
