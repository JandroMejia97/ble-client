import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  AlertController,
  Platform,
  RefresherCustomEvent,
  ToastController,
} from '@ionic/angular';

import {
  BleClient,
  BleDevice,
  ScanResult,
} from '@capacitor-community/bluetooth-le';
import { from, interval, Observable, Subscription, switchMap } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  scanResults: BleDevice[] | null = null;
  devices: BleDevice[] = [];
  bleIsEnabled = false;
  searchingDevices = false;
  private bleEnabled$: Observable<boolean> = interval(5000).pipe(
    switchMap(() => from(BleClient.isEnabled())),
  );
  private subscription: Subscription | null = null;

  constructor(
    private platform: Platform,
    private toastController: ToastController,
    private alertController: AlertController
  ) {}

  ngOnInit(): void {
    this.bleInitializer();
  }

  async ngOnDestroy(): Promise<void> {
    this.subscription?.unsubscribe();
    await BleClient.stopLEScan();
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
      this.bleErrorHandler(error as Error);
    }
  }

  async bleEnable(): Promise<void> {
    let toast: HTMLIonToastElement;
    try {
      await BleClient.enable();
      this.bleIsEnabled = true;

      toast = await this.toastController.create({
        header: 'Bluetooth enabled',
        message: 'You can now start scanning for devices',
        duration: 1500,
        buttons: ['OK'],
      });
      await toast.present();

      await this.getConnectedDevices();
    } catch (error) {
      toast = await this.toastController.create({
        header: "Bluetooth couldn't be enabled",
        message: 'Please enable it manually',
        duration: 3000,
        buttons: ['OK'],
      });
      await toast.present();

      this.bleErrorHandler(error as Error);

      this.subscription = this.bleEnabled$.subscribe({
        next: (isEnabled) => {
          if (isEnabled) {
            this.bleIsEnabled = true;
            this.getConnectedDevices();
          }
        }
      });
    }
  }

  async getConnectedDevices(): Promise<void> {
    try {
      this.devices = await BleClient.getConnectedDevices([]);
      console.info(`Found ${this.devices.length} connected devices`);
    } catch (error) {
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
        this.scanResults?.push(foundDevice);
      });
      console.info('Scan started');

      setTimeout(async () => {
        console.info('Trying to stop scanning');
        await BleClient.stopLEScan();
        const toast = await this.toastController.create({
          header: 'Scan stopped',
          message: `We found ${this.scanResults?.length ?? 0} devices. You can now connect to one of them.`,
          duration: 3000,
          buttons: ['OK'],
        });
        await toast.present();

        this.searchingDevices = false;
      }, 30000);
    } catch (error) {
      this.bleErrorHandler(error as Error);
      this.searchingDevices = false;
    }
  }

  async connectDevice(device: BleDevice): Promise<void> {
    try {
      await BleClient.connect(device.deviceId);

      this.devices.push(device);
      this.scanResults = this.scanResults?.filter((d) => d.deviceId !== device.deviceId) ?? [];

      const toast = await this.toastController.create({
        header: 'Device connected',
        message: 'You can now start communicating with it',
        duration: 3000,
        buttons: ['OK'],
      });

      await toast.present();
    } catch (error) {
      this.bleErrorHandler(error as Error);
    }
  }

  async bleErrorHandler(error: Error): Promise<void> {
    console.error({ error });
    const alert = await this.alertController.create({
      header: error.name || 'Error',
      message: error.message,
      buttons: ['OK'],
    });

    await alert.present();
  }

  trackByDeviceId(index: number, device: BleDevice): string {
    return device.deviceId;
  }

  async refresh(ev: any) {
    await this.startDeviceScan();
    (ev as RefresherCustomEvent).detail.complete();
  }
}
