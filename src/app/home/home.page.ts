import { Component } from '@angular/core';
import {
  AlertController,
  RefresherCustomEvent,
  ToastController,
} from '@ionic/angular';

import { BleClient, BleDevice, ScanResult } from '@capacitor-community/bluetooth-le';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  scanResults: BleDevice[] = [];
  devices: BleDevice[] = [];
  bleIsEnabled = false;
  searchingDevices = false;

  constructor(
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.bleInitializer();
  }

  async bleInitializer(): Promise<void> {
    try {
      await BleClient.initialize({
        androidNeverForLocation: true,
      });
      console.info('BLE initialized');

      this.bleIsEnabled = await BleClient.isEnabled();

      if (!this.bleIsEnabled) {
        const toast = await this.toastController.create({
          header: 'Bluetooth is disabled',
          message: 'Trying to enable it...',
          duration: 1500,
          buttons: ['OK'],
        });
        await toast.present();

        await this.bleEnable();
      } else {
        console.info('Bluetooth is enabled');
        this.getConnectedDevices();
      }
    } catch (error) {
      console.error({ error });
      this.bleErrorHandler(error as Error);
    }
  }

  async bleEnable(): Promise<void> {
    let toast: HTMLIonToastElement;
    try {
      await BleClient.enable();
      this.bleIsEnabled = true;
      this.getConnectedDevices();

      toast = await this.toastController.create({
        header: 'Bluetooth enabled',
        message: 'You can now start scanning for devices',
        duration: 1500,
        buttons: ['OK'],
      });
      await toast.present();

    } catch (error) {
      toast = await this.toastController.create({
        header: "Bluetooth couldn't be enabled",
        message: 'Please enable it manually',
        duration: 3000,
        buttons: ['OK'],
      });
      await toast.present();

      this.bleErrorHandler(error as Error);
    }
  }

  async getConnectedDevices(): Promise<void> {
    try {
      const connectedDevices = await BleClient.getDevices([]);
      console.log({ connectedDevices });
    } catch (error) {
      console.error({ error });
      this.bleErrorHandler(error as Error);
    }
  }

  async startDeviceScan(): Promise<void> {
    this.scanResults = [];
    this.searchingDevices = true;
    try {
      console.info('Starting device scan');
      await BleClient.requestLEScan({}, (scanResult: ScanResult) => {
        const foundDevice = scanResult.device;
        foundDevice.name = scanResult.localName || foundDevice.name;
        console.log(`New device found: ${foundDevice.name}`);
        this.scanResults.push(foundDevice);
      });
      console.info('Scan started');

      setTimeout(async () => {
        console.info('Trying to stop scanning');
        await BleClient.stopLEScan();
        const toast = await this.toastController.create({
          header: 'Scan stopped',
          message: `We found ${this.scanResults.length} devices. You can now connect to one of them.`,
          duration: 3000,
          buttons: ['OK'],
        });
        await toast.present();

        this.searchingDevices = false;
      }, 60000);
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
