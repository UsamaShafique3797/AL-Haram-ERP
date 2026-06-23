import { Directive, Input, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/** Show template content only when the user has at least one of the given roles. */
@Directive({
  selector: '[requireRoles]',
  standalone: true,
})
export class RequireRolesDirective implements OnInit {
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private auth = inject(AuthService);

  @Input({ alias: 'requireRoles', required: true }) roles!: string | readonly string[];

  ngOnInit(): void {
    const list = typeof this.roles === 'string'
      ? this.roles.split(',').map((r) => r.trim())
      : [...this.roles];
    if (this.auth.hasRole(...list)) {
      this.vcr.createEmbeddedView(this.tpl);
    }
  }
}
