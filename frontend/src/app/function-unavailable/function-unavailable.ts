import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-function-unavailable',
  standalone: true,
  imports: [],
  templateUrl: './function-unavailable.html',
  styleUrl: './function-unavailable.css',
})
export class FunctionUnavailable {
  readonly embedded = input(false);
  readonly closed = output<void>();

  goBack(): void {
    if (this.embedded()) {
      this.closed.emit();
      return;
    }

    window.history.back();
  }
}
