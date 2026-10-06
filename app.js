import {apiGet,apiPost,isConfigured} from "./api.js";
import {money,dateText,id,esc,sumItems,parseItems,toast,field,formData,printInvoice} from "./utils.js";
const names={venta:"Nueva venta",ventas:"Ventas",compras:"Compras",productos:"Productos",categorias:"Categorías",clientes:"Clientes",proveedores:"Proveedores"};
const resources=["productos","ventas","compras","clientes","proveedores","categorias"];
const data=Object.fromEntries(resources.map(x=>[x,[]]));
let view="venta", cart=[], currentSale=null, pay="Efectivo", filter="", purchaseCart=[];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const admin=()=>$("#role").value==="Administrador";
function setConnection(ok,label){$("#connection-dot").className=`dot ${ok?"on":"off"}`;$("#connection-label").textContent=label}
async function loadAll(){
 $("#view").innerHTML='<div class="loading"><span class="spinner"></span>Cargando datos…</div>';
 try{const rows=await Promise.all(resources.map(apiGet));resources.forEach((r,i)=>data[r]=Array.isArray(rows[i])?rows[i]:[]);setConnection(true,"Google Sheets conectado");render()}
 catch(e){setConnection(false,"Sin conexión a Sheets");$("#view").innerHTML=`<div class="card panel"><h2 style="font:22px Georgia">No se pudieron cargar los datos</h2><p class="subtle">${esc(e.message)}</p><div class="callout">Verifica que la hoja tenga las seis pestañas requeridas y que la URL /exec esté configurada en <b>config.js</b>. No hay datos de demostración ni almacenamiento local.</div><button class="btn primary" id="retry">Reintentar</button></div>`;$("#retry").onclick=loadAll}
}
function nav(v){view=v;$("#page-title").textContent=names[v]||v;$("#navigation").querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v));$$(".sidebar [data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===v));render()}
function pageHead(title,desc,button=""){return `<div class="page-heading"><div><h2>${title}</h2><p>${desc}</p></div>${button}</div>`}
function render(){if(!$("#view"))return;({venta:renderSale,ventas:renderSales,productos:renderProducts,categorias:()=>renderEntities("categorias"),clientes:()=>renderEntities("clientes"),proveedores:()=>renderEntities("proveedores"),compras:renderPurchases}[view]||renderSale)()}
function optionsFrom(list,empty="Sin selección"){return list.map(x=>`<option value="${esc(x.id)}">${esc(x.nombre)}</option>`).join("")}
function renderSale(){
 const open=data.ventas.filter(v=>v.estado==="abierta");
 $("#view").innerHTML=`${pageHead(currentSale?`Venta ${esc(currentSale.id.slice(0,8))}`:"Venta en curso",open.length?`${open.length} venta${open.length===1?" abierta":"s abiertas"} guardada${open.length===1?"":"s"}`:"Los cambios se guardan en Google Sheets.",open.length?`<button class="btn secondary" id="resume">Retomar venta</button>`:"")}
 <div class="sale-layout"><div class="card panel"><div class="panel-head"><h3>Productos</h3><span class="subtle">${data.productos.length} en catálogo</span></div><div class="search-wrap"><input id="product-search" placeholder="Buscar por nombre o código…" autocomplete="off"></div><div id="product-results"></div><div style="height:23px"></div><div class="panel-head"><h3>Artículos de la venta</h3><button class="text-button" id="new-sale">＋ Nueva venta</button></div><div class="cart-head"><span>Producto</span><span>Cantidad</span><span style="text-align:right">Importe</span><span></span></div><div id="cart-body"></div></div>
 <div class="card panel summary-panel"><div class="panel-head"><h3>Resumen</h3><span class="status open">En curso</span></div><div class="field"><label for="sale-client">Cliente</label><select id="sale-client"><option value="">Venta general (opcional)</option>${optionsFrom(data.clientes)}</select></div><div class="totals"><div class="total-line"><span>Subtotal</span><b id="subtotal">${money(sumItems(cart))}</b></div><div class="total-line grand"><span>Total</span><b id="grand-total">${money(sumItems(cart))}</b></div></div><div style="padding-top:15px"><span class="subtle">Método de pago</span><div class="pay-options">${["Efectivo","Nequi","Debe"].map(p=>`<button class="pay-chip ${pay===p?"selected":""}" data-pay="${p}">${p}</button>`).join("")}</div><div id="payment-extra">${paymentFields()}</div><p class="hint">Las ventas abiertas no afectan el inventario. El stock se descuenta al cerrar una venta.</p><button class="btn secondary full-btn" id="save-open">Guardar abierta</button><button class="btn primary full-btn" id="close-sale">Confirmar y cerrar venta</button></div></div></div>`;
 updateCart();
 $("#product-search").oninput=e=>showProductResults(e.target.value);
 $$("[data-pay]").forEach(b=>b.onclick=()=>{const chosen=$("#sale-client")?.value||"";pay=b.dataset.pay;renderSale();if($("#sale-client"))$("#sale-client").value=chosen});
 $("#new-sale").onclick=()=>{cart=[];currentSale=null;pay="Efectivo";renderSale()};
 $("#save-open").onclick=()=>saveOpen(); $("#close-sale").onclick=()=>closeSale();
 $("#resume")?.addEventListener("click",openResume);
}
function paymentFields(){return pay==="Efectivo"?`<div class="field"><label for="received">Valor recibido</label><input id="received" type="number" min="0" step="1" placeholder="0" inputmode="numeric"><small>Cambio: <b id="change">${money(0)}</b></small></div>`:pay==="Debe"?`<p class="hint">El método Debe requiere seleccionar un cliente.</p>`:`<p class="hint">El pago se registrará como Nequi.</p>`}
function updateCart(){const body=$("#cart-body");if(!body)return;body.innerHTML=cart.length?cart.map((i,n)=>`<div class="cart-row"><div><span class="item-name">${esc(i.nombre)}</span><span class="item-meta">${money(i.precio)} c/u</span></div><input class="qty" data-qty="${n}" type="number" min="1" step="1" value="${i.cantidad}"><span class="row-total">${money(i.precio*i.cantidad)}</span><button class="remove" data-remove="${n}" title="Quitar">×</button></div>`).join(""):`<div class="empty"><div class="empty-icon">▤</div>Busca un producto para agregarlo a la venta.</div>`;
 const total=sumItems(cart);$("#subtotal").textContent=money(total);$("#grand-total").textContent=money(total);$$("[data-qty]").forEach(i=>i.onchange=()=>{const n=Number(i.value);if(!Number.isInteger(n)||n<1){i.value=cart[i.dataset.qty].cantidad;return}cart[i.dataset.qty].cantidad=n;updateCart()});$$("[data-remove]").forEach(b=>b.onclick=()=>{cart.splice(Number(b.dataset.remove),1);updateCart()});$("#received")?.addEventListener("input",e=>{$("#change").textContent=money(Math.max(0,(Number(e.target.value)||0)-total))})
}
function showProductResults(q) {
  const target = $("#product-results");
  if (!target) return;

  q = q.trim().toLocaleLowerCase();

  const found = data.productos
    .filter(p =>
      !q ||
      `${p.nombre} ${p.codigo || ""}`.toLocaleLowerCase().includes(q)
    )
    .slice(0, 6);

  if (!found.length) {
    target.innerHTML =
      '<div class="subtle" style="padding:15px 2px">No se encontraron productos.</div>';
    return;
  }

  target.innerHTML = `
    <div style="margin-top:10px">
      ${found.map(p => {
        const category = data.categorias.find(
          c => c.id === p.categoriaId
        );

        const stockText = p.seguimientoInventario
          ? `Stock ${Number(p.stock) || 0}`
          : "Sin seguimiento";

        const editButton = admin()
          ? `<button class="text-button" data-edit-sale-product="${esc(p.id)}">Editar</button>`
          : "";

        return `
          <div class="product-pick-wrap">
            <button class="product-pick" data-add="${esc(p.id)}">
              <span>
                <b>${esc(p.nombre)}</b>
                <small>
                  ${esc(category?.nombre || "Sin categoría")} · ${stockText}
                </small>
              </span>
              <strong>${money(p.precio)}</strong>
            </button>
            ${editButton}
          </div>
        `;
      }).join("")}
    </div>
  `;

  $$("[data-add]").forEach(button => {
    button.onclick = () => {
      const product = data.productos.find(
        x => String(x.id) === button.dataset.add
      );

      if (!product) return;

      const existing = cart.find(
        item => String(item.productoId) === String(product.id)
      );

      if (existing) {
        existing.cantidad++;
      } else {
        cart.push({
          productoId: product.id,
          nombre: product.nombre,
          precio: Number(product.precio) || 0,
          costo: Number(product.costo) || 0,
          cantidad: 1
        });
      }

      $("#product-search").value = "";
      showProductResults("");
      updateCart();
    };
  });

  $$("[data-edit-sale-product]").forEach(button => {
    button.onclick = () => {
      editEntity(
        "productos",
        data.productos.find(
          x => String(x.id) === button.dataset.editSaleProduct
        )
      );
    };
  });
}
function saleRecord(state,method=pay){const now=new Date().toISOString(),client=$("#sale-client")?.value||currentSale?.clienteId||"",customer=data.clientes.find(c=>String(c.id)===String(client));return{id:currentSale?.id||id(),fecha:currentSale?.fecha||now,estado:state,clienteId:client,metodoPago:method,subtotal:sumItems(cart),total:sumItems(cart),valorRecibido:method==="Efectivo"?(Number($("#received")?.value)||0):sumItems(cart),cambio:method==="Efectivo"?Math.max(0,(Number($("#received")?.value)||0)-sumItems(cart)):0,itemsJson:cart,actualizadoEn:now,clienteNombre:customer?.nombre||""}}
async function saveOpen(){if(!cart.length)return toast("Agrega al menos un producto antes de guardar.","error");const sale=saleRecord("abierta");await withBusy("#save-open",async()=>{await apiPost("ventas",currentSale?"update":"create",sale);currentSale=sale;await loadAll();toast("Venta abierta guardada en Google Sheets.","success")})}
async function closeSale(){if(!cart.length)return toast("No se puede cerrar una venta vacía.","error");const client=$("#sale-client")?.value||currentSale?.clienteId||"";if(pay==="Debe"&&!client)return toast("Selecciona un cliente para registrar una venta a crédito.","error");const total=sumItems(cart),received=Number($("#received")?.value)||0;if(pay==="Efectivo"&&received<total)return toast("El valor recibido debe cubrir el total.","error");const insufficient=cart.map(i=>({item:i,product:data.productos.find(p=>String(p.id)===String(i.productoId))})).find(x=>x.product?.seguimientoInventario===true&&Number(x.product.stock)<x.item.cantidad);if(insufficient)return toast(`Stock insuficiente para ${insufficient.item.nombre}. Disponible: ${Number(insufficient.product.stock)||0}.`,"error");const sale=saleRecord("cerrada");await withBusy("#close-sale",async()=>{await apiPost("ventas",currentSale?"update":"create",sale);let failed=[];for(const i of cart){const p=data.productos.find(x=>String(x.id)===String(i.productoId));if(p?.seguimientoInventario===true){try{await apiPost("productos","update",{id:p.id,stock:Number(p.stock)-i.cantidad})}catch(e){failed.push(p.nombre)}}}await loadAll();cart=[];currentSale=null;view="ventas";nav("ventas");toast(failed.length?`Venta cerrada, pero no se pudo actualizar el stock de: ${failed.join(", ")}. Corrígelo en Productos.`:"Venta cerrada y stock actualizado.",failed.length?"error":"success");showSaleDetail(sale)})}
async function openResume(){const opens=data.ventas.filter(x=>x.estado==="abierta");const choices=opens.map(s=>`<button class="product-pick" data-resume="${esc(s.id)}"><span><b>${esc(dateText(s.fecha))}</b><small>${parseItems(s.itemsJson).length} productos · ${esc(s.id)}</small></span><strong>${money(s.total)}</strong></button>`).join("");modal("Retomar una venta abierta",choices||"No hay ventas abiertas.");$$('[data-resume]').forEach(b=>b.onclick=()=>{const s=data.ventas.find(x=>String(x.id)===b.dataset.resume);currentSale=s;cart=parseItems(s.itemsJson);pay=s.metodoPago||"Efectivo";closeModal();nav("venta");setTimeout(()=>{if($("#sale-client"))$("#sale-client").value=s.clienteId||""},0)})}
function renderSales(){let rows=data.ventas.filter(s=>!filter||`${s.id} ${s.metodoPago} ${s.estado} ${data.clientes.find(c=>String(c.id)===String(s.clienteId))?.nombre||""}`.toLowerCase().includes(filter.toLowerCase())).sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)));$("#view").innerHTML=`${pageHead("Historial de ventas","Consulta ventas cerradas y retoma ventas abiertas.",`<button class="btn primary" id="start-sale">＋ Nueva venta</button>`)}<div class="toolbar"><input id="table-search" placeholder="Buscar venta, cliente o pago…" value="${esc(filter)}"><select id="sales-state"><option value="">Todos los estados</option><option value="cerrada">Cerradas</option><option value="abierta">Abiertas</option></select></div><div class="card table-wrap"><table><thead><tr><th>FECHA</th><th>CLIENTE</th><th>MÉTODO</th><th>ESTADO</th><th>TOTAL</th><th></th></tr></thead><tbody>${rows.length?rows.map(s=>`<tr><td>${esc(dateText(s.fecha))}</td><td>${esc(data.clientes.find(c=>String(c.id)===String(s.clienteId))?.nombre||"Venta general")}</td><td>${esc(s.metodoPago||"—")}</td><td><span class="status ${s.estado==="abierta"?"open":""}">${esc(s.estado)}</span></td><td><b>${money(s.total)}</b></td><td><div class="actions"><button class="text-button" data-detail-sale="${esc(s.id)}">Detalle</button>${s.estado==="cerrada"?`<button class="text-button" data-print-sale="${esc(s.id)}">Factura</button>`:`<button class="text-button" data-resume="${esc(s.id)}">Retomar</button>`}</div></td></tr>`).join(""):`<tr><td colspan="6" class="empty-table">No hay ventas que coincidan.</td></tr>`}</tbody></table></div>`;$("#start-sale").onclick=()=>{currentSale=null;cart=[];pay="Efectivo";nav("venta")};$("#table-search").oninput=e=>{filter=e.target.value;renderSales()};$("#sales-state").onchange=e=>{const v=e.target.value;$$("tbody tr").forEach(tr=>{const status=tr.querySelector(".status");if(status)tr.hidden=!!v&&status.textContent!==v})};$$("[data-detail-sale]").forEach(b=>b.onclick=()=>showSaleDetail(data.ventas.find(s=>String(s.id)===b.dataset.detailSale)));$$("[data-print-sale]").forEach(b=>b.onclick=()=>printInvoice(data.ventas.find(s=>String(s.id)===b.dataset.printSale)));$$("[data-resume]").forEach(b=>b.onclick=()=>{currentSale=data.ventas.find(s=>String(s.id)===b.dataset.resume);cart=parseItems(currentSale.itemsJson);pay=currentSale.metodoPago||"Efectivo";nav("venta")})}
function showSaleDetail(s){const items=parseItems(s.itemsJson);modal(`Detalle de venta <small class="subtle">${esc(s.id)}</small>`,`<div class="detail-line"><span>Fecha</span><b>${esc(dateText(s.fecha))}</b></div><div class="detail-line"><span>Cliente</span><b>${esc(data.clientes.find(c=>String(c.id)===String(s.clienteId))?.nombre||"Venta general")}</b></div><div class="detail-line"><span>Método de pago</span><b>${esc(s.metodoPago||"—")}</b></div>${items.map(i=>`<div class="detail-line"><span>${esc(i.nombre)} × ${Number(i.cantidad)||0}</span><b>${money((Number(i.precio)||0)*(Number(i.cantidad)||0))}</b></div>`).join("")}<div class="detail-line"><span>Total</span><b>${money(s.total)}</b></div><div class="form-actions"><button class="btn secondary" id="invoice">Imprimir factura</button>${s.estado==="abierta"?`<button class="btn primary" id="resume-detail">Retomar venta</button>`:""}</div>`);$("#invoice").onclick=()=>printInvoice(s);$("#resume-detail")?.addEventListener("click",()=>{$("#modal").close();currentSale=s;cart=parseItems(s.itemsJson);pay=s.metodoPago||"Efectivo";nav("venta")})}
const entityConfig={productos:{title:"Productos",desc:"Administra precios, categorías y existencias.",fields:["nombre","categoriaId","precio","costo","seguimientoInventario","stock"]},categorias:{title:"Categorías",desc:"Organiza los productos del catálogo.",fields:["nombre"]},clientes:{title:"Clientes",desc:"Contactos para ventas y pagos pendientes.",fields:["nombre","telefono","correo"]},proveedores:{title:"Proveedores",desc:"Contactos asociados a tus compras.",fields:["nombre","telefono","correo"]}};
function renderProducts(){renderEntities("productos")}
function renderEntities(resource){const cfg=entityConfig[resource],arr=data[resource];const term=filter.toLowerCase();const rows=arr.filter(r=>!term||Object.values(r).join(" ").toLowerCase().includes(term));$("#view").innerHTML=`${pageHead(cfg.title,cfg.desc,admin()?`<button class="btn primary" id="add-record">＋ Nuevo ${resource==="productos"?"producto":resource.slice(0,-1)}</button>`:"")}<div class="toolbar"><input id="table-search" placeholder="Buscar ${cfg.title.toLowerCase()}…" value="${esc(filter)}"></div><div class="card table-wrap"><table><thead><tr>${(resource==="productos"?["CÓDIGO","NOMBRE","CATEGORÍA","PRECIO","COSTO","STOCK","" ]:resource==="categorias"?["NOMBRE","PRODUCTOS",""]:["NOMBRE","TELÉFONO","CORREO",""]).map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.length?rows.map(r=>entityRow(resource,r)).join(""):`<tr><td colspan="7" class="empty-table">No hay registros todavía.</td></tr>`}</tbody></table></div>`;$("#table-search").oninput=e=>{filter=e.target.value;renderEntities(resource)};$("#add-record")?.addEventListener("click",()=>editEntity(resource));$$("[data-edit]").forEach(b=>b.onclick=()=>editEntity(resource,arr.find(x=>String(x.id)===b.dataset.edit)));$$("[data-delete]").forEach(b=>b.onclick=()=>deleteEntity(resource,arr.find(x=>String(x.id)===b.dataset.delete)))}
function entityRow(res,r){if(res==="productos")return`<tr><td>${esc(r.codigo||"—")}</td><td><b>${esc(r.nombre)}</b></td><td>${esc(data.categorias.find(c=>String(c.id)===String(r.categoriaId))?.nombre||"—")}</td><td>${money(r.precio)}</td><td>${money(r.costo)}</td><td>${r.seguimientoInventario?Number(r.stock)||0:"—"}</td><td>${entityButtons(r)}</td></tr>`;if(res==="categorias")return`<tr><td><b>${esc(r.nombre)}</b></td><td>${data.productos.filter(p=>String(p.categoriaId)===String(r.id)).length}</td><td>${entityButtons(r)}</td></tr>`;return`<tr><td><b>${esc(r.nombre)}</b></td><td>${esc(r.telefono||"—")}</td><td>${esc(r.correo||"—")}</td><td>${entityButtons(r)}</td></tr>`}
function entityButtons(r){return admin()?`<div class="actions"><button class="text-button" data-edit="${esc(r.id)}">Editar</button><button class="text-button red" data-delete="${esc(r.id)}">Eliminar</button></div>`:""}
function editEntity(res,item){const categoryOpts=data.categorias.map(c=>({value:c.id,label:c.nombre}));let f="";for(const k of entityConfig[res].fields){const value=item?.[k]??"";let label=k==="nombre"?"Nombre":k==="telefono"?"Teléfono":k==="correo"?"Correo electrónico":k==="precio"?"Precio de venta":k==="costo"?"Costo de compra":k==="categoriaId"?"Categoría":k==="seguimientoInventario"?"Seguimiento de inventario":"Stock";let opts={required:true};if(["precio","costo","stock"].includes(k)){opts.type="number";opts.required=k!=="stock"||item?.seguimientoInventario!==false}if(k==="correo"){opts.type="email";opts.required=false}if(k==="telefono")opts.required=false;if(k==="categoriaId"){opts.options=[{value:"",label:"Selecciona categoría"},...categoryOpts];opts.full=true}if(k==="seguimientoInventario"){opts.options=[{value:"true",label:"Sí, controlar inventario"},{value:"false",label:"No controlar inventario"}];opts.required=true}if(k==="stock"&&item?.seguimientoInventario===false)continue;f+=field(label,k,k==="seguimientoInventario"?String(value!==false):value,opts)}if(res==="productos"&&!data.categorias.length)return toast("Crea primero una categoría para poder asignarla al producto.","error");modal(item?`Editar ${entityConfig[res].title.slice(0,-1).toLowerCase()}`:`Nuevo ${entityConfig[res].title.slice(0,-1).toLowerCase()}`,`<form id="entity-form"><div class="fields">${f}</div><div class="form-actions"><button type="button" class="btn secondary" id="cancel">Cancelar</button><button class="btn primary" id="submit-entity">Guardar</button></div></form>`);$("#cancel").onclick=closeModal;$("#f-seguimientoInventario")?.addEventListener("change",e=>{const stock=$("#f-stock");stock.parentElement.hidden=e.target.value!=="true";stock.required=e.target.value==="true"});$("#entity-form").onsubmit=async e=>{e.preventDefault();const form=formData(e.target);const record={...(item||{}),id:item?.id||id(),...form};if(res==="productos"){record.precio=Number(form.precio);record.costo=Number(form.costo);record.seguimientoInventario=form.seguimientoInventario==="true";record.stock=record.seguimientoInventario?Number(form.stock??item?.stock??0):Number(item?.stock)||0;record.codigo=item?.codigo||`PL-${Date.now().toString().slice(-7)}`;if(!record.categoriaId)return toast("Selecciona una categoría.","error")}else{record.nombre=String(form.nombre||"").trim();if(form.telefono!==undefined)record.telefono=String(form.telefono).trim();if(form.correo!==undefined)record.correo=String(form.correo).trim()}if(["productos"].includes(res)&&[record.precio,record.costo,record.stock].some(n=>!Number.isFinite(n)||n<0))return toast("Precio, costo y stock deben ser números no negativos.","error");await withBusy("#submit-entity",async()=>{await apiPost(res,item?"update":"create",record);if(res==="productos")cart=cart.map(i=>String(i.productoId)===String(record.id)?{...i,nombre:record.nombre,precio:record.precio,costo:record.costo}:i);closeModal();await loadAll();toast("Cambios guardados.","success")})}}
function entityInUse(res,r){if(res==="categorias")return data.productos.some(p=>String(p.categoriaId)===String(r.id));if(res==="proveedores")return data.compras.some(p=>String(p.proveedorId)===String(r.id));if(res==="clientes")return data.ventas.some(v=>String(v.clienteId)===String(r.id));return data.ventas.some(v=>parseItems(v.itemsJson).some(i=>String(i.productoId)===String(r.id)))||data.compras.some(c=>parseItems(c.itemsJson).some(i=>String(i.productoId)===String(r.id)))}
async function deleteEntity(res,r){if(!admin())return toast("Esta acción requiere rol Administrador.","error");if(entityInUse(res,r))return toast("No se puede eliminar: el registro está relacionado con datos existentes.","error");if(!confirm(`¿Eliminar «${r.nombre}»? Esta acción no se puede deshacer.`))return;try{await apiPost(res,"delete",{id:r.id});await loadAll();toast("Registro eliminado.","success")}catch(e){toast(`No se pudo eliminar: ${e.message}`,"error")}}
function renderPurchases(){const buys=data.compras.slice().sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)));$("#view").innerHTML=`${pageHead("Compras","Registra ingresos de mercancía y actualiza el inventario.",admin()?`<button class="btn primary" id="new-purchase">＋ Registrar compra</button>`:"")}<div class="card table-wrap"><table><thead><tr><th>FECHA</th><th>PROVEEDOR</th><th>PRODUCTOS</th><th>TOTAL</th><th></th></tr></thead><tbody>${buys.length?buys.map(b=>`<tr><td>${esc(dateText(b.fecha))}</td><td>${esc(data.proveedores.find(p=>String(p.id)===String(b.proveedorId))?.nombre||"—")}</td><td>${parseItems(b.itemsJson).length}</td><td><b>${money(b.total)}</b></td><td><div class="actions"><button class="text-button" data-purchase="${esc(b.id)}">Detalle</button></div></td></tr>`).join(""):`<tr><td colspan="5" class="empty-table">Todavía no hay compras registradas.</td></tr>`}</tbody></table></div>`;$("#new-purchase")?.addEventListener("click",newPurchase);$$("[data-purchase]").forEach(b=>b.onclick=()=>purchaseDetail(buys.find(x=>String(x.id)===b.dataset.purchase)))}
function newPurchase(){purchaseCart=[];if(!data.proveedores.length)return toast("Registra primero un proveedor.","error");if(!data.productos.length)return toast("Registra primero al menos un producto.","error");modal("Registrar compra",`<form id="purchase-form"><div class="fields">${field("Proveedor","proveedorId","",{options:[{value:"",label:"Selecciona proveedor"},...data.proveedores.map(p=>({value:p.id,label:p.nombre}))],full:true})}${field("Agregar producto","productId","",{options:[{value:"",label:"Selecciona producto"},...data.productos.map(p=>({value:p.id,label:p.nombre}))],full:true})}${field("Cantidad","quantity","1",{type:"number"})}${field("Costo unitario","cost","0",{type:"number"})}</div><button type="button" id="add-purchase-item" class="btn secondary" style="margin-top:11px">Agregar producto</button><div id="purchase-lines" style="margin-top:9px"></div><div class="detail-line" style="margin-top:10px"><span>Total compra</span><b id="purchase-total">${money(0)}</b></div><div class="form-actions"><button type="button" class="btn secondary" id="cancel">Cancelar</button><button class="btn primary" id="submit-purchase">Guardar compra</button></div></form>`);$("#cancel").onclick=closeModal;$("#add-purchase-item").onclick=()=>{const pid=$("#f-productId").value,q=Number($("#f-quantity").value),cost=Number($("#f-cost").value);if(!pid||!Number.isInteger(q)||q<=0||!Number.isFinite(cost)||cost<0)return toast("Selecciona producto, cantidad válida y costo no negativo.","error");const p=data.productos.find(x=>String(x.id)===pid);const item=purchaseCart.find(x=>String(x.productoId)===pid);if(item){item.cantidad+=q;item.costo=cost}else purchaseCart.push({productoId:p.id,nombre:p.nombre,precio:Number(p.precio)||0,costo,cantidad:q});drawPurchaseLines()};$("#purchase-form").onsubmit=async e=>{e.preventDefault();const proveedorId=$("#f-proveedorId").value;if(!proveedorId||!purchaseCart.length)return toast("Selecciona proveedor y agrega al menos un producto.","error");const purchase={id:id(),fecha:new Date().toISOString(),proveedorId,total:purchaseCart.reduce((a,i)=>a+i.costo*i.cantidad,0),itemsJson:purchaseCart};await withBusy("#submit-purchase",async()=>{await apiPost("compras","create",purchase);let failed=[];for(const i of purchaseCart){const p=data.productos.find(x=>String(x.id)===String(i.productoId));if(p?.seguimientoInventario===true){try{await apiPost("productos","update",{id:p.id,stock:(Number(p.stock)||0)+i.cantidad,costo:i.costo})}catch{failed.push(p.nombre)}}else if(p){try{await apiPost("productos","update",{id:p.id,costo:i.costo})}catch{failed.push(p.nombre)}}}closeModal();await loadAll();toast(failed.length?`Compra guardada, pero revisa el inventario/costo de: ${failed.join(", ")}.`:"Compra registrada; existencias y costos actualizados.",failed.length?"error":"success")})}}
function drawPurchaseLines(){const t=$("#purchase-lines");t.innerHTML=purchaseCart.map((i,n)=>`<div class="detail-line"><span>${esc(i.nombre)} × ${i.cantidad} · ${money(i.costo)} c/u</span><b>${money(i.costo*i.cantidad)} <button class="text-button red" data-premove="${n}">×</button></b></div>`).join("");$("#purchase-total").textContent=money(purchaseCart.reduce((a,i)=>a+i.costo*i.cantidad,0));$$("[data-premove]").forEach(b=>b.onclick=()=>{purchaseCart.splice(Number(b.dataset.premove),1);drawPurchaseLines()})}
function purchaseDetail(b){modal(`Detalle de compra <small class="subtle">${esc(b.id)}</small>`,`<div class="detail-line"><span>Fecha</span><b>${esc(dateText(b.fecha))}</b></div><div class="detail-line"><span>Proveedor</span><b>${esc(data.proveedores.find(p=>String(p.id)===String(b.proveedorId))?.nombre||"—")}</b></div>${parseItems(b.itemsJson).map(i=>`<div class="detail-line"><span>${esc(i.nombre)} × ${i.cantidad}</span><b>${money(i.costo*i.cantidad)}</b></div>`).join("")}<div class="detail-line"><span>Total</span><b>${money(b.total)}</b></div>`)}
function modal(title,body){const d=$("#modal");d.innerHTML=`<div class="modal-head"><h3>${title}</h3><button class="text-button" id="modal-close">✕</button></div><div class="modal-body">${body}</div>`;d.showModal();$("#modal-close").onclick=closeModal}
function closeModal(){$("#modal").close()}
async function withBusy(selector,fn){const button=$(selector);if(button)button.disabled=true;try{await fn()}catch(e){toast(e.message||"Error al guardar. Revisa tu conexión e inténtalo de nuevo.","error")}finally{if(button?.isConnected)button.disabled=false}}
$("#navigation").addEventListener("click",e=>{const b=e.target.closest("[data-view]");if(b)nav(b.dataset.view)});$$(".sidebar [data-view]").forEach(b=>b.addEventListener("click",()=>nav(b.dataset.view)));$("#refresh").onclick=loadAll;$("#role").onchange=()=>{toast(`Rol activo: ${$("#role").value}.`,"info");render()};$("#modal").addEventListener("click",e=>{if(e.target===$("#modal"))closeModal()});
if(!isConfigured())setConnection(false,"Configura Apps Script");loadAll();



