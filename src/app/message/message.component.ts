import { Component, Input } from '@angular/core';

import { BleDevice } from '@capacitor-community/bluetooth-le';

@Component({
  selector: 'app-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss'],
})
export class MessageComponent {
  @Input()
  device!: BleDevice;

  isIos() {
    const win = window as any;
    return win && win.Ionic && win.Ionic.mode === 'ios';
  }
}
