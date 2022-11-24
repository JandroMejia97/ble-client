import { Component } from '@angular/core';
import { AlertController, RefresherCustomEvent } from '@ionic/angular';

import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  scanResults: ScanResult[] = [];
  bleIsEnabled = false;
  searchingDevices = false;

  constructor(private alertController: AlertController) {}

  async ngOnInit(): Promise<void> {
    try {
      await BleClient.initialize();
      console.info('BLE initialized');

      this.bleIsEnabled = await BleClient.isEnabled();

      if (!this.bleIsEnabled) {
        console.info('Bluetooth is not enabled, trying to enable it');
        await BleClient.enable();
      } else {
        console.info('Bluetooth is enabled');
      }
    } catch (error) {
      console.error({ error });
      this.bleErrorHandler(error as Error);
    }
  }

  async startDeviceScan(): Promise<void> {
    try {
      this.searchingDevices = true;
      console.info('Starting device scan');
      await BleClient.requestLEScan({}, (scanResult: ScanResult) => {
        console.log(`New device found: ${scanResult.device.name}`);
        this.scanResults.push(scanResult);
      });
      console.info('Scan started');

      setTimeout(async () => {
        console.info('Trying to stop scanning');
        await BleClient.stopLEScan();
        console.log('Scan stopped');
        console.info(`We found ${this.scanResults.length} devices`);
        this.searchingDevices = false;
      }, 5000);
    } catch (error) {
      console.error({ error });
      this.bleErrorHandler(error as Error);
      this.searchingDevices = false;
    }
  }

  async bleErrorHandler(error: Error): Promise<void> {
    const alert = await this.alertController.create({
      header: error.name || 'Error',
      message: error.message,
      buttons: ['OK'],
    });

    await alert.present();
  }

  async refresh(ev: any) {
    await this.startDeviceScan();
    (ev as RefresherCustomEvent).detail.complete();
  }
}
